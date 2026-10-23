from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional

from app.database import supabase
from app.routes.student import require_student
from app.utils.badges import evaluate_user_badges, calculate_xp, BADGE_DEFINITIONS

router = APIRouter()

VALID_DOMAINS = [
    "Full Stack Developer",
    "Python Developer",
    "UI / UX Design",
    "Data Science",
]

VALID_CATEGORIES = [
    "overall",
    "challenges",
    "quiz",
    "projects",
    "streaks",
    "phases",
]


def _get_user(user_id: str) -> dict:
    resp = supabase.table("users").select("*").eq("id", user_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return resp.data


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/student/badges
# Return current student's earned badges, locked badges with progress, and stats
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/student/badges")
async def get_my_badges(student: dict = Depends(require_student)):
    user_id = student.get("sub")
    user = _get_user(user_id)

    # 1. Challenges solved
    ch_resp = supabase.table("challenge_submissions").select("challenge_id").eq("user_id", user_id).execute()
    challenges_solved = len(ch_resp.data or [])

    # 2. Quiz stats
    quiz_resp = supabase.table("quiz_results").select("score, passed").eq("user_id", user_id).execute()
    quiz_rows = quiz_resp.data or []
    quizzes_attempted = len(quiz_rows)
    quizzes_passed = sum(1 for q in quiz_rows if q.get("passed"))
    perfect_quizzes = sum(1 for q in quiz_rows if q.get("score") == 100)
    scores = [q["score"] for q in quiz_rows if q.get("score") is not None]
    avg_quiz_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    # 3. Phase Progress (phases, projects, lectures)
    pp_resp = supabase.table("phase_progress").select("*").eq("user_id", user_id).execute()
    pp_rows = pp_resp.data or []
    lectures_watched = sum(1 for p in pp_rows if p.get("lecture_watched"))
    phases_completed = sum(1 for p in pp_rows if p.get("phase_completed"))
    projects_submitted = sum(
        1 for p in pp_rows for k, v in p.items()
        if k.startswith("project_") and k.endswith("_submitted") and v
    )

    # 4. Streak
    streak_resp = supabase.table("study_streaks").select("current_streak, longest_streak").eq("user_id", user_id).execute()
    streak_row = (streak_resp.data or [{}])[0]
    current_streak = streak_row.get("current_streak", 0)

    # 5. XP Calculation
    total_xp = calculate_xp(
        lectures_watched=lectures_watched,
        challenges_solved=challenges_solved,
        quizzes_passed=quizzes_passed,
        perfect_quizzes=perfect_quizzes,
        projects_submitted=projects_submitted,
        phases_completed=phases_completed,
        current_streak=current_streak,
    )

    stats = {
        "user_id": user_id,
        "full_name": user.get("full_name"),
        "domain": user.get("domain"),
        "total_xp": total_xp,
        "challenges_solved": challenges_solved,
        "quizzes_attempted": quizzes_attempted,
        "quizzes_passed": quizzes_passed,
        "perfect_quizzes": perfect_quizzes,
        "avg_quiz_score": avg_quiz_score,
        "projects_submitted": projects_submitted,
        "phases_completed": phases_completed,
        "lectures_watched": lectures_watched,
        "current_streak": current_streak,
        "rank": None,
    }

    badge_data = evaluate_user_badges(stats)

    return {
        "stats": stats,
        **badge_data,
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/student/leaderboard
# Multi-domain & multi-category rankings with badges & XP
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/student/leaderboard")
async def get_leaderboard(
    domain: Optional[str] = "All",
    category: Optional[str] = "overall",
    student: dict = Depends(require_student),
):
    user_id = student.get("sub")
    user = _get_user(user_id)

    # 1. Fetch Users
    query = supabase.table("users").select("id, full_name, domain, photo_url")
    if domain and domain != "All" and domain in VALID_DOMAINS:
        query = query.eq("domain", domain)
    users_resp = query.execute()
    users_list = users_resp.data or []

    if not users_list:
        return {
            "leaderboard": [],
            "your_stats": None,
            "domain": domain,
            "category": category,
            "total_students": 0,
            "available_domains": ["All"] + VALID_DOMAINS,
            "available_categories": VALID_CATEGORIES,
        }

    user_ids = [u["id"] for u in users_list]
    user_map = {u["id"]: u for u in users_list}

    # 2. Batch fetch challenges
    ch_resp = supabase.table("challenge_submissions").select("user_id").in_("user_id", user_ids).execute()
    ch_counts: dict = {}
    for row in ch_resp.data or []:
        ch_counts[row["user_id"]] = ch_counts.get(row["user_id"], 0) + 1

    # 3. Batch fetch quizzes
    quiz_resp = supabase.table("quiz_results").select("user_id, score, passed").in_("user_id", user_ids).execute()
    quiz_scores: dict = {}
    quiz_passed_counts: dict = {}
    perfect_quiz_counts: dict = {}
    for row in quiz_resp.data or []:
        uid = row["user_id"]
        sc = row.get("score")
        if sc is not None:
            quiz_scores.setdefault(uid, []).append(sc)
            if sc == 100:
                perfect_quiz_counts[uid] = perfect_quiz_counts.get(uid, 0) + 1
        if row.get("passed"):
            quiz_passed_counts[uid] = quiz_passed_counts.get(uid, 0) + 1

    # 4. Batch fetch phase_progress
    pp_resp = supabase.table("phase_progress").select("*").in_("user_id", user_ids).execute()
    phases_completed_counts: dict = {}
    projects_counts: dict = {}
    lectures_counts: dict = {}
    for p in pp_resp.data or []:
        uid = p["user_id"]
        if p.get("phase_completed"):
            phases_completed_counts[uid] = phases_completed_counts.get(uid, 0) + 1
        if p.get("lecture_watched"):
            lectures_counts[uid] = lectures_counts.get(uid, 0) + 1
        proj_count = sum(
            1 for k, v in p.items()
            if k.startswith("project_") and k.endswith("_submitted") and v
        )
        projects_counts[uid] = projects_counts.get(uid, 0) + proj_count

    # 5. Batch fetch study_streaks
    streak_resp = supabase.table("study_streaks").select("user_id, current_streak").in_("user_id", user_ids).execute()
    streak_by_user = {row["user_id"]: row.get("current_streak", 0) for row in (streak_resp.data or [])}

    # 6. Aggregate stats & XP for each user
    entries = []
    for uid in user_ids:
        u_info = user_map.get(uid, {})
        u_scores = quiz_scores.get(uid, [])
        avg_quiz = round(sum(u_scores) / len(u_scores), 1) if u_scores else 0.0
        ch_count = ch_counts.get(uid, 0)
        q_passed = quiz_passed_counts.get(uid, 0)
        perfect_q = perfect_quiz_counts.get(uid, 0)
        proj_count = projects_counts.get(uid, 0)
        ph_completed = phases_completed_counts.get(uid, 0)
        lec_count = lectures_counts.get(uid, 0)
        streak = streak_by_user.get(uid, 0)

        total_xp = calculate_xp(
            lectures_watched=lec_count,
            challenges_solved=ch_count,
            quizzes_passed=q_passed,
            perfect_quizzes=perfect_q,
            projects_submitted=proj_count,
            phases_completed=ph_completed,
            current_streak=streak,
        )

        entries.append({
            "user_id": uid,
            "full_name": u_info.get("full_name") or "Student",
            "domain": u_info.get("domain") or "General",
            "photo_url": u_info.get("photo_url"),
            "total_xp": total_xp,
            "challenges_solved": ch_count,
            "quizzes_passed": q_passed,
            "perfect_quizzes": perfect_q,
            "avg_quiz_score": avg_quiz,
            "projects_submitted": proj_count,
            "phases_completed": ph_completed,
            "lectures_watched": lec_count,
            "current_streak": streak,
            "rank": 0,
        })

    # 7. Sort by requested Category
    cat = category if category in VALID_CATEGORIES else "overall"
    if cat == "challenges":
        entries.sort(key=lambda e: (e["challenges_solved"], e["total_xp"]), reverse=True)
    elif cat == "quiz":
        entries.sort(key=lambda e: (e["avg_quiz_score"], e["quizzes_passed"], e["total_xp"]), reverse=True)
    elif cat == "projects":
        entries.sort(key=lambda e: (e["projects_submitted"], e["total_xp"]), reverse=True)
    elif cat == "streaks":
        entries.sort(key=lambda e: (e["current_streak"], e["total_xp"]), reverse=True)
    elif cat == "phases":
        entries.sort(key=lambda e: (e["phases_completed"], e["total_xp"]), reverse=True)
    else:  # overall
        entries.sort(key=lambda e: e["total_xp"], reverse=True)

    # 8. Assign Ranks and evaluate Badges for entries
    your_stats = None
    for i, e in enumerate(entries):
        e["rank"] = i + 1
        badges_eval = evaluate_user_badges(e)
        e["primary_badge"] = badges_eval.get("primary_badge")
        e["badges_count"] = badges_eval.get("total_unlocked", 0)
        e["top_badges"] = badges_eval.get("unlocked_badges", [])[:3]

        if e["user_id"] == user_id:
            your_stats = e

    return {
        "leaderboard": entries[:50],
        "your_stats": your_stats,
        "domain": domain,
        "category": cat,
        "total_students": len(entries),
        "available_domains": ["All"] + VALID_DOMAINS,
        "available_categories": VALID_CATEGORIES,
    }