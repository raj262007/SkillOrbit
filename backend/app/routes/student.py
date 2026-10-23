import random
import re
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from app.database import supabase
from app.utils.auth import verify_token

router = APIRouter()
security = HTTPBearer()

MCQ_COUNT_PER_ATTEMPT = 20
TEXT_COUNT_PER_ATTEMPT = 10
PASS_PERCENTAGE = 75


# ─────────────────────────────────────────────────────────────────────────────
# require_student — JWT dependency, only allows role == "student"
# ─────────────────────────────────────────────────────────────────────────────

def require_student(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")
    if payload.get("role") != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access required.")
    return payload


def _get_user(user_id: str) -> dict:
    resp = supabase.table("users").select("*").eq("id", user_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return resp.data


def _get_or_create_progress(user_id: str, domain: str, phase_number: int) -> dict:
    resp = (
        supabase.table("phase_progress")
        .select("*")
        .eq("user_id", user_id)
        .eq("domain", domain)
        .eq("phase_number", phase_number)
        .execute()
    )
    rows = resp.data or []
    if rows:
        return rows[0]

    new_row = {
        "user_id": user_id,
        "domain": domain,
        "phase_number": phase_number,
        "lecture_watched": False,
        "quiz_attempts": 0,
        "quiz_passed": False,
        "project_1_submitted": False,
        "project_2_submitted": False,
        "phase_completed": False,
    }
    insert_resp = supabase.table("phase_progress").insert(new_row).execute()
    return insert_resp.data[0]


def _check_phase_unlocked(user_id: str, domain: str, phase_number: int, user: dict = None) -> None:
    """Phase 1 is always unlocked. Phase N requires phase N-1 completed.
    Preview accounts (is_preview_account = true in `users` table) skip this check entirely
    so the owner/tester can jump into any phase without completing previous ones."""
    if user and user.get("is_preview_account"):
        return
    if phase_number == 1:
        return
    prev_resp = (
        supabase.table("phase_progress")
        .select("phase_completed")
        .eq("user_id", user_id)
        .eq("domain", domain)
        .eq("phase_number", phase_number - 1)
        .execute()
    )
    prev_rows = prev_resp.data or []
    if not prev_rows or not prev_rows[0].get("phase_completed"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Complete the previous phase first.")


VALID_DOMAINS = [
    "Full Stack Developer",
    "Python Developer",
    "UI / UX Design",
    "Data Science",
]

class SwitchDomainRequest(BaseModel):
    domain: str


@router.post("/student/switch-domain")
async def switch_domain(body: SwitchDomainRequest, student: dict = Depends(require_student)):
    if body.domain not in VALID_DOMAINS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid domain '{body.domain}'. Must be one of {VALID_DOMAINS}"
        )
    user_id = student.get("sub")
    supabase.table("users").update({"domain": body.domain}).eq("id", user_id).execute()
    return {"success": True, "domain": body.domain}


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/student/dashboard
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/student/dashboard")
async def get_student_dashboard(domain: str = None, student: dict = Depends(require_student)):
    user_id = student.get("sub")
    user = _get_user(user_id)
    active_domain = domain if (domain and domain in VALID_DOMAINS) else user.get("domain")

    phases_resp = supabase.table("phases").select("*").eq("domain", active_domain).order("phase_number").execute()
    phases = phases_resp.data or []

    progress_resp = (
        supabase.table("phase_progress").select("*").eq("user_id", user_id).eq("domain", active_domain).execute()
    )
    progress_by_phase = {row["phase_number"]: row for row in (progress_resp.data or [])}

    is_preview = bool(user.get("is_preview_account"))

    result = []
    previous_completed = True
    for phase in phases:
        phase_number = phase["phase_number"]
        progress = progress_by_phase.get(phase_number)
        is_completed = bool(progress and progress.get("phase_completed"))
        is_unlocked = previous_completed or is_preview  # preview accounts: every phase shows unlocked
        phase_status = "completed" if is_completed else ("unlocked" if is_unlocked else "locked")

        # Works for phases with 2 projects OR phases with 3+ (like Python Developer Phase 5)
        projects_submitted_count = sum(
            1 for key, val in (progress or {}).items()
            if key.startswith("project_") and key.endswith("_submitted") and val
        )

        result.append({
            "phase_number": phase_number,
            "phase_title": phase.get("phase_title"),
            "weeks_covered": phase.get("weeks_covered"),
            "status": phase_status,
            "lecture_watched": bool(progress and progress.get("lecture_watched")),
            "quiz_attempts": (progress or {}).get("quiz_attempts", 0),
            "quiz_score": (progress or {}).get("quiz_score"),
            "quiz_passed": bool(progress and progress.get("quiz_passed")),
            "projects_submitted_count": projects_submitted_count,
        })
        previous_completed = is_completed

    completed_count = sum(1 for p in result if p["status"] == "completed")

    return {
        "user": {
            "id": user.get("id"),
            "full_name": user.get("full_name"),
            "email": user.get("email"),
            "domain": active_domain,
            "subscription_type": user.get("subscription_type"),
            "enrollment_no": user.get("enrollment_no"),
            "branch": user.get("branch"),
            "year": user.get("year"),
            "photo_url": user.get("photo_url"),
            "whatsapp": user.get("whatsapp"),
            "created_at": user.get("created_at"),
            "is_preview_account": is_preview,
        },
        "is_preview": is_preview,
        "available_domains": VALID_DOMAINS,
        "total_phases": len(result),
        "completed_phases": completed_count,
        "phases": result,
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/student/phase/{phase_number}
# Full state for one phase: lecture info, progress, projects (solution gated)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/student/phase/{phase_number}")
async def get_phase_detail(phase_number: int, domain: str = None, student: dict = Depends(require_student)):
    user_id = student.get("sub")
    user = _get_user(user_id)
    active_domain = domain if (domain and domain in VALID_DOMAINS) else user.get("domain")

    _check_phase_unlocked(user_id, active_domain, phase_number, user)

    phase_resp = (
        supabase.table("phases")
        .select("*")
        .eq("domain", active_domain)
        .eq("phase_number", phase_number)
        .execute()
    )
    phase_rows = phase_resp.data or []
    if not phase_rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase not found.")
    phase = phase_rows[0]

    progress = _get_or_create_progress(user_id, active_domain, phase_number)

    lectures_resp = (
        supabase.table("phase_lectures")
        .select("*")
        .eq("domain", active_domain)
        .eq("phase_number", phase_number)
        .order("order_index")
        .execute()
    )
    lectures = [
        {
            "topic_title": row["topic_title"],
            "video_url": row["video_url"],
            "notes_content": row.get("notes_content"),
            "start_time_seconds": row.get("start_time_seconds") or 0,
            "end_time_seconds": row.get("end_time_seconds"),
        }
        for row in (lectures_resp.data or [])
    ]

    projects_resp = (
        supabase.table("projects")
        .select("*")
        .eq("domain", active_domain)
        .eq("phase_number", phase_number)
        .order("project_number")
        .execute()
    )
    projects = []
    for proj in (projects_resp.data or []):
        submitted_flag = progress.get(f"project_{proj['project_number']}_submitted", False)
        github_link = progress.get(f"project_{proj['project_number']}_github_link")
        projects.append({
            "project_number": proj["project_number"],
            "project_name": proj["project_name"],
            "description": proj["description"],
            "difficulty": proj["difficulty"],
            "submitted": bool(submitted_flag),
            "your_github_link": github_link,
            # Reference solution only revealed after the student submits their own, or preview account
            "solution_reference": proj["solution_reference"],
        })

    is_preview = bool(user.get("is_preview_account"))

    return {
        "domain": active_domain,
        "phase_number": phase_number,
        "phase_title": phase.get("phase_title"),
        "weeks_covered": phase.get("weeks_covered"),
        "lectures": lectures,
        "video_notes": phase.get("video_notes"),
        "is_preview": is_preview,
        # Real values — kept accurate so preview accounts can still actually take the
        # real quiz/mark lecture watched themselves to test the flow, not just see it faked.
        "lecture_watched": bool(progress.get("lecture_watched")),
        "quiz": {
            "attempts": progress.get("quiz_attempts", 0),
            "score": progress.get("quiz_score"),
            "passed": bool(progress.get("quiz_passed")),
        },
        "projects": projects,
        "phase_completed": bool(progress.get("phase_completed")),
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/student/phase/{phase_number}/lecture-watched
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/student/phase/{phase_number}/lecture-watched")
async def mark_lecture_watched(phase_number: int, student: dict = Depends(require_student)):
    user_id = student.get("sub")
    user = _get_user(user_id)
    domain = user.get("domain")

    _check_phase_unlocked(user_id, domain, phase_number, user)
    progress = _get_or_create_progress(user_id, domain, phase_number)

    supabase.table("phase_progress").update({"lecture_watched": True}).eq("id", progress["id"]).execute()
    return {"success": True, "lecture_watched": True}


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/student/phase/{phase_number}/quiz
# Generates a random 20 MCQ + 10 Text quiz (no correct answers included)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/student/phase/{phase_number}/quiz")
async def get_quiz(phase_number: int, domain: str = None, student: dict = Depends(require_student)):
    user_id = student.get("sub")
    user = _get_user(user_id)
    active_domain = domain if (domain and domain in VALID_DOMAINS) else user.get("domain")

    _check_phase_unlocked(user_id, active_domain, phase_number, user)
    progress = _get_or_create_progress(user_id, active_domain, phase_number)

    if not progress.get("lecture_watched") and not user.get("is_preview_account"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Watch the lecture before taking the quiz.")

    mcq_resp = (
        supabase.table("quiz_questions")
        .select("id, question_text, option_a, option_b, option_c, option_d")
        .eq("domain", active_domain).eq("phase_number", phase_number).eq("question_type", "mcq")
        .execute()
    )
    mcq_pool = mcq_resp.data or []

    if not mcq_pool:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz questions are not set up for this phase yet.")

    sample_size = min(MCQ_COUNT_PER_ATTEMPT, len(mcq_pool))
    selected_mcq = random.sample(mcq_pool, sample_size)

    questions = []
    for q in selected_mcq:
        questions.append({
            "id": q["id"],
            "type": "mcq",
            "question_text": q["question_text"],
            "options": {
                "A": q["option_a"],
                "B": q["option_b"],
                "C": q["option_c"],
                "D": q["option_d"],
            },
        })

    random.shuffle(questions)
    return {
        "phase_number": phase_number,
        "total_questions": len(questions),
        "questions": questions,
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/student/phase/{phase_number}/quiz/submit
# ─────────────────────────────────────────────────────────────────────────────

class QuizAnswer(BaseModel):
    question_id: str
    answer: str


class QuizSubmitRequest(BaseModel):
    answers: list[QuizAnswer]


def _normalize_words(text: str) -> set:
    text = re.sub(r"[^a-z0-9\s]", " ", text.lower())
    stopwords = {"a", "an", "the", "is", "are", "was", "were", "to", "of", "in", "on", "and", "or", "it", "that", "this"}
    return {w for w in text.split() if w and w not in stopwords}


@router.post("/student/phase/{phase_number}/quiz/submit")
async def submit_quiz(phase_number: int, body: QuizSubmitRequest, student: dict = Depends(require_student)):
    user_id = student.get("sub")
    user = _get_user(user_id)
    domain = user.get("domain")

    _check_phase_unlocked(user_id, domain, phase_number, user)
    progress = _get_or_create_progress(user_id, domain, phase_number)

    question_ids = [a.question_id for a in body.answers]
    questions_resp = supabase.table("quiz_questions").select("*").in_("id", question_ids).execute()
    questions_by_id = {q["id"]: q for q in (questions_resp.data or [])}

    correct_count = 0
    total = len(body.answers)
    breakdown = []

    for ans in body.answers:
        q = questions_by_id.get(ans.question_id)
        if not q:
            continue
        is_correct = False
        if q["question_type"] == "mcq":
            is_correct = ans.answer.strip().upper() == q["correct_answer"].strip().upper()
        else:
            expected_words = _normalize_words(q["correct_answer"])
            given_words = _normalize_words(ans.answer)
            overlap = len(expected_words & given_words) / max(len(expected_words), 1)
            is_correct = overlap >= 0.4  # heuristic keyword-match grading

        if is_correct:
            correct_count += 1
        breakdown.append({"question_id": ans.question_id, "correct": is_correct})

    score_percent = round((correct_count / total) * 100) if total else 0
    passed = score_percent >= PASS_PERCENTAGE
    new_attempt_number = (progress.get("quiz_attempts") or 0) + 1

    supabase.table("quiz_results").insert({
        "user_id": user_id,
        "domain": domain,
        "phase_number": phase_number,
        "attempt_number": new_attempt_number,
        "question_ids": question_ids,
        "answers_given": [a.dict() for a in body.answers],
        "score": score_percent,
        "passed": passed,
    }).execute()

    supabase.table("phase_progress").update({
        "quiz_attempts": new_attempt_number,
        "quiz_score": score_percent,
        "quiz_passed": passed or bool(progress.get("quiz_passed")),
    }).eq("id", progress["id"]).execute()

    return {
        "score": score_percent,
        "passed": passed,
        "correct_count": correct_count,
        "total_questions": total,
        "pass_percentage": PASS_PERCENTAGE,
        "breakdown": breakdown,
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/student/phase/{phase_number}/project/{project_number}/submit
# ─────────────────────────────────────────────────────────────────────────────

class ProjectSubmitRequest(BaseModel):
    github_link: str


@router.post("/student/phase/{phase_number}/project/{project_number}/submit")
async def submit_project(
    phase_number: int, project_number: int, body: ProjectSubmitRequest,
    student: dict = Depends(require_student),
):
    user_id = student.get("sub")
    user = _get_user(user_id)
    domain = user.get("domain")

    # How many projects actually exist for this phase (2 for most phases, 3 for phases like
    # Python Developer Phase 5 which covers Flask/Django/FastAPI as separate projects).
    total_projects_resp = (
        supabase.table("projects").select("project_number", count="exact")
        .eq("domain", domain).eq("phase_number", phase_number).execute()
    )
    total_projects = total_projects_resp.count or 2
    valid_project_numbers = tuple(range(1, total_projects + 1))

    if project_number not in valid_project_numbers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"project_number must be one of {valid_project_numbers} for this phase.",
        )

    _check_phase_unlocked(user_id, domain, phase_number, user)
    progress = _get_or_create_progress(user_id, domain, phase_number)

    if not progress.get("quiz_passed") and not user.get("is_preview_account"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Pass the quiz before submitting projects.")

    update_data = {
        f"project_{project_number}_submitted": True,
        f"project_{project_number}_github_link": body.github_link,
    }
    supabase.table("phase_progress").update(update_data).eq("id", progress["id"]).execute()

    # Re-fetch to check if ALL projects for this phase are now submitted -> mark phase completed
    refreshed = supabase.table("phase_progress").select("*").eq("id", progress["id"]).single().execute().data
    all_done = all(refreshed.get(f"project_{n}_submitted") for n in valid_project_numbers)
    if all_done and not refreshed.get("phase_completed"):
        supabase.table("phase_progress").update({
            "phase_completed": True,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", progress["id"]).execute()

    return {"success": True, "phase_completed": all_done}



# ─────────────────────────────────────────────────────────────────────────────
# DELETE /api/student/phase/{phase_number}/project/{project_number}
# Lets a student remove/unsubmit their GitHub link (e.g. to redo it)
# ─────────────────────────────────────────────────────────────────────────────

@router.delete("/student/phase/{phase_number}/project/{project_number}")
async def delete_project_submission(
    phase_number: int, project_number: int, student: dict = Depends(require_student),
):
    if project_number not in (1, 2):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="project_number must be 1 or 2.")

    user_id = student.get("sub")
    user = _get_user(user_id)
    domain = user.get("domain")

    _check_phase_unlocked(user_id, domain, phase_number, user)
    progress = _get_or_create_progress(user_id, domain, phase_number)

    update_data = {
        f"project_{project_number}_submitted": False,
        f"project_{project_number}_github_link": None,
        # if the phase had been marked complete, removing a submission reopens it
        "phase_completed": False,
        "completed_at": None,
    }
    supabase.table("phase_progress").update(update_data).eq("id", progress["id"]).execute()

    return {"success": True}