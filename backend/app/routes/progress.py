from datetime import datetime, timezone, date, timedelta

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel

from app.database import supabase
from app.routes.student import require_student  # reuse existing student-only JWT check

router = APIRouter()


def _get_user(user_id: str) -> dict:
    resp = supabase.table("users").select("*").eq("id", user_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return resp.data


def _touch_streak(user_id: str) -> None:
    """Call this from any 'activity' endpoint (lecture watched, quiz submit,
    project submit, challenge solved, flashcard reviewed) to keep the streak fresh."""
    today = date.today()
    resp = supabase.table("study_streaks").select("*").eq("user_id", user_id).execute()
    row = resp.data[0] if resp.data else None

    if row is None:
        supabase.table("study_streaks").insert({
            "user_id": user_id, "current_streak": 1, "longest_streak": 1,
            "last_active_date": today.isoformat(),
        }).execute()
        return

    last_active = row.get("last_active_date")
    last_active_date = datetime.fromisoformat(last_active).date() if last_active else None

    if last_active_date == today:
        return  # already logged today, don't double count
    elif last_active_date == today - timedelta(days=1):
        new_streak = row["current_streak"] + 1
    else:
        new_streak = 1  # streak broken, restart

    longest = max(row["longest_streak"], new_streak)
    supabase.table("study_streaks").update({
        "current_streak": new_streak, "longest_streak": longest,
        "last_active_date": today.isoformat(),
    }).eq("user_id", user_id).execute()


# ─────────────────────────────────────────────────────────────────────────────
# 1. CODING CHALLENGES
# ─────────────────────────────────────────────────────────────────────────────

class ChallengeSubmitRequest(BaseModel):
    submitted_code: str


@router.get("/student/phase/{phase_number}/challenges")
async def get_challenges(phase_number: int, domain: str = None, student: dict = Depends(require_student)):
    user_id = student.get("sub")
    user = _get_user(user_id)
    active_domain = domain if (domain and domain in ["Full Stack Developer", "Python Developer", "UI / UX Design", "Data Science"]) else user.get("domain")

    challenges_resp = (
        supabase.table("coding_challenges").select("*").eq("domain", active_domain).eq("phase_number", phase_number).execute()
    )
    challenges = challenges_resp.data or []

    solved_resp = (
        supabase.table("challenge_submissions").select("challenge_id").eq("user_id", user_id).execute()
    )
    solved_ids = {row["challenge_id"] for row in (solved_resp.data or [])}

    is_preview = bool(user.get("is_preview_account"))

    result = []
    for c in challenges:
        is_solved = c["id"] in solved_ids
        result.append({
            "id": c["id"], "title": c["title"], "description": c["description"],
            "difficulty": c["difficulty"], "starter_code": c.get("starter_code"),
            "hint": c.get("hint"), "solved": is_solved,
            # solution revealed if solved or if preview account for quick testing
            "solution_code": c.get("solution_code") if (is_solved or is_preview) else None,
        })
    return {"phase_number": phase_number, "challenges": result}


@router.post("/student/challenges/{challenge_id}/submit")
async def submit_challenge(challenge_id: str, body: ChallengeSubmitRequest, student: dict = Depends(require_student)):
    user_id = student.get("sub")

    challenge_resp = supabase.table("coding_challenges").select("*").eq("id", challenge_id).single().execute()
    if not challenge_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

    supabase.table("challenge_submissions").upsert({
        "user_id": user_id, "challenge_id": challenge_id,
        "submitted_code": body.submitted_code, "status": "solved",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }, on_conflict="user_id,challenge_id").execute()

    _touch_streak(user_id)
    return {"message": "Marked as solved.", "challenge_id": challenge_id}


# ─────────────────────────────────────────────────────────────────────────────
# 3. FLASHCARDS (simplified SM-2 spaced repetition)
# ─────────────────────────────────────────────────────────────────────────────

class FlashcardReviewRequest(BaseModel):
    quality: int  # 0-5, how well the student recalled it (5 = perfect, 0 = blackout)


@router.get("/student/flashcards/due")
async def get_due_flashcards(student: dict = Depends(require_student)):
    user_id = student.get("sub")
    user = _get_user(user_id)
    domain = user.get("domain")
    today = date.today().isoformat()

    all_cards_resp = supabase.table("flashcards").select("*").eq("domain", domain).execute()
    all_cards = {c["id"]: c for c in (all_cards_resp.data or [])}

    reviews_resp = supabase.table("flashcard_reviews").select("*").eq("user_id", user_id).execute()
    reviewed_ids = {r["flashcard_id"]: r for r in (reviews_resp.data or [])}

    due = []
    for card_id, card in all_cards.items():
        review = reviewed_ids.get(card_id)
        if review is None or review["next_review_date"] <= today:
            due.append({
                "flashcard_id": card_id, "question": card["question"], "answer": card["answer"],
                "phase_number": card["phase_number"],
            })
    return {"due_count": len(due), "flashcards": due}


@router.post("/student/flashcards/{flashcard_id}/review")
async def review_flashcard(flashcard_id: str, body: FlashcardReviewRequest, student: dict = Depends(require_student)):
    user_id = student.get("sub")
    if not (0 <= body.quality <= 5):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="quality must be between 0 and 5.")

    resp = (
        supabase.table("flashcard_reviews").select("*")
        .eq("user_id", user_id).eq("flashcard_id", flashcard_id).execute()
    )
    row = resp.data[0] if resp.data else None
    ease = row["ease_factor"] if row else 2.5
    interval = row["interval_days"] if row else 1
    reviewed_count = row["times_reviewed"] if row else 0

    # simplified SM-2 algorithm
    if body.quality < 3:
        interval = 1
    else:
        if reviewed_count == 0:
            interval = 1
        elif reviewed_count == 1:
            interval = 6
        else:
            interval = round(interval * ease)
        ease = max(1.3, ease + (0.1 - (5 - body.quality) * (0.08 + (5 - body.quality) * 0.02)))

    next_review = (date.today() + timedelta(days=interval)).isoformat()

    supabase.table("flashcard_reviews").upsert({
        "user_id": user_id, "flashcard_id": flashcard_id, "ease_factor": ease,
        "interval_days": interval, "times_reviewed": reviewed_count + 1,
        "next_review_date": next_review, "last_reviewed_at": datetime.now(timezone.utc).isoformat(),
    }, on_conflict="user_id,flashcard_id").execute()

    _touch_streak(user_id)
    return {"next_review_date": next_review, "interval_days": interval}


# ─────────────────────────────────────────────────────────────────────────────
# 4. DOUBT / DISCUSSION SECTION
# ─────────────────────────────────────────────────────────────────────────────

class DiscussionPostRequest(BaseModel):
    message: str
    parent_id: str | None = None


@router.get("/student/phase/{phase_number}/discussion")
async def get_discussion(phase_number: int, student: dict = Depends(require_student)):
    user_id = student.get("sub")
    user = _get_user(user_id)
    domain = user.get("domain")

    resp = (
        supabase.table("discussions").select("*, users(full_name)")
        .eq("domain", domain).eq("phase_number", phase_number)
        .order("created_at").execute()
    )
    return {"phase_number": phase_number, "messages": resp.data or []}


@router.post("/student/phase/{phase_number}/discussion")
async def post_discussion(phase_number: int, body: DiscussionPostRequest, student: dict = Depends(require_student)):
    user_id = student.get("sub")
    user = _get_user(user_id)
    domain = user.get("domain")

    if not body.message.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty.")

    insert_resp = supabase.table("discussions").insert({
        "domain": domain, "phase_number": phase_number, "user_id": user_id,
        "parent_id": body.parent_id, "message": body.message.strip(),
    }).execute()

    return {"message": "Posted.", "data": insert_resp.data[0] if insert_resp.data else None}


# ─────────────────────────────────────────────────────────────────────────────
# 6. PROGRESS ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/student/analytics")
async def get_analytics(student: dict = Depends(require_student)):
    user_id = student.get("sub")

    streak_resp = supabase.table("study_streaks").select("*").eq("user_id", user_id).execute()
    streak = streak_resp.data[0] if streak_resp.data else {"current_streak": 0, "longest_streak": 0}

    quiz_resp = supabase.table("quiz_results").select("score, passed").eq("user_id", user_id).execute()
    quizzes = quiz_resp.data or []
    avg_score = round(sum(q["score"] for q in quizzes) / len(quizzes), 1) if quizzes else 0

    challenge_resp = (
        supabase.table("challenge_submissions").select("id", count="exact").eq("user_id", user_id).execute()
    )
    projects_resp = (
        supabase.table("phase_progress").select("project_1_submitted, project_2_submitted").eq("user_id", user_id).execute()
    )
    total_projects = sum(
        int(bool(row.get("project_1_submitted"))) + int(bool(row.get("project_2_submitted")))
        for row in (projects_resp.data or [])
    )

    return {
        "current_streak": streak["current_streak"],
        "longest_streak": streak["longest_streak"],
        "total_quizzes_taken": len(quizzes),
        "average_quiz_score": avg_score,
        "total_challenges_solved": challenge_resp.count or 0,
        "total_projects_submitted": total_projects,
    }