"""
PathForge AI — Badge & Gamification Engine.
Calculates student XP, milestone achievements, and badge unlocks.
"""
from typing import Dict, List, Any

BADGE_DEFINITIONS: List[Dict[str, Any]] = [
    # ── Practice Challenges ──
    {
        "id": "challenge_novice",
        "title": "Code Novice",
        "icon": "🧩",
        "category": "challenges",
        "tier": "bronze",
        "description": "Solve your first practice coding challenge",
        "threshold": 1,
        "metric": "challenges_solved",
    },
    {
        "id": "challenge_builder",
        "title": "Logic Builder",
        "icon": "⚡",
        "category": "challenges",
        "tier": "silver",
        "description": "Solve 10 practice coding challenges",
        "threshold": 10,
        "metric": "challenges_solved",
    },
    {
        "id": "challenge_ace",
        "title": "Algorithm Ace",
        "icon": "⚔️",
        "category": "challenges",
        "tier": "gold",
        "description": "Solve 25 practice coding challenges",
        "threshold": 25,
        "metric": "challenges_solved",
    },
    {
        "id": "challenge_grandmaster",
        "title": "Grandmaster Coder",
        "icon": "🧙‍♂️",
        "category": "challenges",
        "tier": "diamond",
        "description": "Solve 50+ practice coding challenges",
        "threshold": 50,
        "metric": "challenges_solved",
    },

    # ── Quiz Mastery ──
    {
        "id": "quiz_first_pass",
        "title": "Quick Thinker",
        "icon": "💡",
        "category": "quiz",
        "tier": "bronze",
        "description": "Pass your first weekly assessment quiz",
        "threshold": 1,
        "metric": "quizzes_passed",
    },
    {
        "id": "quiz_sharp_shooter",
        "title": "Sharp Shooter",
        "icon": "🎯",
        "category": "quiz",
        "tier": "silver",
        "description": "Score a perfect 100% on any phase quiz",
        "threshold": 1,
        "metric": "perfect_quizzes",
    },
    {
        "id": "quiz_flawless_streak",
        "title": "Quiz Titan",
        "icon": "🧠",
        "category": "quiz",
        "tier": "gold",
        "description": "Pass 5 weekly phase quizzes",
        "threshold": 5,
        "metric": "quizzes_passed",
    },
    {
        "id": "quiz_domain_scholar",
        "title": "Domain Scholar",
        "icon": "🦉",
        "category": "quiz",
        "tier": "diamond",
        "description": "Maintain an average quiz score of 90% or above (min 3 quizzes)",
        "threshold": 90,
        "metric": "avg_quiz_score",
        "min_quizzes": 3,
    },

    # ── Projects ──
    {
        "id": "project_first_ship",
        "title": "First Ship",
        "icon": "🔨",
        "category": "projects",
        "tier": "bronze",
        "description": "Build and submit your first real-world project",
        "threshold": 1,
        "metric": "projects_submitted",
    },
    {
        "id": "project_full_stack",
        "title": "Full-Stack Builder",
        "icon": "🛠️",
        "category": "projects",
        "tier": "silver",
        "description": "Submit 3 verified GitHub project challenges",
        "threshold": 3,
        "metric": "projects_submitted",
    },
    {
        "id": "project_production_ready",
        "title": "Production Ready",
        "icon": "🚀",
        "category": "projects",
        "tier": "gold",
        "description": "Submit 6 verified projects to your portfolio",
        "threshold": 6,
        "metric": "projects_submitted",
    },
    {
        "id": "project_architect",
        "title": "Software Architect",
        "icon": "🏛️",
        "category": "projects",
        "tier": "diamond",
        "description": "Submit 10+ completed projects across your roadmap",
        "threshold": 10,
        "metric": "projects_submitted",
    },

    # ── Roadmap & Phases ──
    {
        "id": "phase_groundbreaker",
        "title": "Groundbreaker",
        "icon": "🏁",
        "category": "phases",
        "tier": "bronze",
        "description": "Complete Phase 1 and build your learning foundation",
        "threshold": 1,
        "metric": "phases_completed",
    },
    {
        "id": "phase_halfway_hero",
        "title": "Halfway Hero",
        "icon": "🧗",
        "category": "phases",
        "tier": "silver",
        "description": "Complete 3 full roadmap phases",
        "threshold": 3,
        "metric": "phases_completed",
    },
    {
        "id": "phase_master",
        "title": "Roadmap Finisher",
        "icon": "🎓",
        "category": "phases",
        "tier": "diamond",
        "description": "Complete 6+ phases of your career track",
        "threshold": 6,
        "metric": "phases_completed",
    },

    # ── Consistency & Streaks ──
    {
        "id": "streak_spark",
        "title": "Spark",
        "icon": "🕯️",
        "category": "streak",
        "tier": "bronze",
        "description": "Maintain a 3-day active study streak",
        "threshold": 3,
        "metric": "streak",
    },
    {
        "id": "streak_firestarter",
        "title": "Firestarter",
        "icon": "🔥",
        "category": "streak",
        "tier": "silver",
        "description": "Maintain a 7-day continuous study streak",
        "threshold": 7,
        "metric": "streak",
    },
    {
        "id": "streak_unstoppable",
        "title": "Unstoppable",
        "icon": "⚡",
        "category": "streak",
        "tier": "gold",
        "description": "Maintain a 14-day continuous study streak",
        "threshold": 14,
        "metric": "streak",
    },
    {
        "id": "streak_century",
        "title": "Century Beast",
        "icon": "☀️",
        "category": "streak",
        "tier": "diamond",
        "description": "Maintain a 30-day legendary study streak",
        "threshold": 30,
        "metric": "streak",
    },

    # ── Elite Leaderboard Rank ──
    {
        "id": "rank_top_10",
        "title": "Top 10 Contender",
        "icon": "🏅",
        "category": "rank",
        "tier": "silver",
        "description": "Climb into the Top 10 on the leaderboard",
        "threshold": 10,
        "metric": "rank_le",
    },
    {
        "id": "rank_podium",
        "title": "Podium Finisher",
        "icon": "🥈",
        "category": "rank",
        "tier": "gold",
        "description": "Reach the Top 3 on the leaderboard",
        "threshold": 3,
        "metric": "rank_le",
    },
    {
        "id": "rank_champion",
        "title": "Domain Champion #1",
        "icon": "👑",
        "category": "rank",
        "tier": "diamond",
        "description": "Hold the #1 position on the leaderboard",
        "threshold": 1,
        "metric": "rank_le",
    },
]

TIER_ORDER = {"diamond": 4, "gold": 3, "silver": 2, "bronze": 1}


def calculate_xp(
    lectures_watched: int,
    challenges_solved: int,
    quizzes_passed: int,
    perfect_quizzes: int,
    projects_submitted: int,
    phases_completed: int,
    current_streak: int,
) -> int:
    """Calculate total experience points (XP) from student activity."""
    return (
        (lectures_watched * 20)
        + (challenges_solved * 50)
        + (quizzes_passed * 100)
        + (perfect_quizzes * 50)
        + (projects_submitted * 200)
        + (phases_completed * 300)
        + (current_streak * 15)
    )


def evaluate_user_badges(stats: Dict[str, Any]) -> Dict[str, Any]:
    """
    Given a user's stats dict, returns all badges with unlock status,
    progress, primary badge, and category groupings.
    """
    challenges_solved = stats.get("challenges_solved", 0)
    quizzes_passed = stats.get("quizzes_passed", 0)
    perfect_quizzes = stats.get("perfect_quizzes", 0)
    avg_quiz_score = stats.get("avg_quiz_score", 0.0)
    quizzes_attempted = stats.get("quizzes_attempted", 0)
    projects_submitted = stats.get("projects_submitted", 0)
    phases_completed = stats.get("phases_completed", 0)
    streak = stats.get("current_streak", 0)
    rank = stats.get("rank")

    unlocked_badges = []
    locked_badges = []

    for badge in BADGE_DEFINITIONS:
        metric = badge["metric"]
        threshold = badge["threshold"]
        is_unlocked = False
        current_val = 0

        if metric == "challenges_solved":
            current_val = challenges_solved
            is_unlocked = current_val >= threshold
        elif metric == "quizzes_passed":
            current_val = quizzes_passed
            is_unlocked = current_val >= threshold
        elif metric == "perfect_quizzes":
            current_val = perfect_quizzes
            is_unlocked = current_val >= threshold
        elif metric == "avg_quiz_score":
            current_val = avg_quiz_score
            min_q = badge.get("min_quizzes", 1)
            is_unlocked = (avg_quiz_score >= threshold) and (quizzes_attempted >= min_q)
        elif metric == "projects_submitted":
            current_val = projects_submitted
            is_unlocked = current_val >= threshold
        elif metric == "phases_completed":
            current_val = phases_completed
            is_unlocked = current_val >= threshold
        elif metric == "streak":
            current_val = streak
            is_unlocked = current_val >= threshold
        elif metric == "rank_le":
            current_val = rank if rank is not None else 9999
            is_unlocked = (rank is not None) and (rank <= threshold)

        badge_item = {
            **badge,
            "unlocked": is_unlocked,
            "current_value": current_val,
            "max_value": threshold,
            "progress_percent": min(100, int((current_val / threshold) * 100)) if threshold > 0 else (100 if is_unlocked else 0),
        }

        if is_unlocked:
            unlocked_badges.append(badge_item)
        else:
            locked_badges.append(badge_item)

    # Sort unlocked badges by tier priority (diamond > gold > silver > bronze)
    unlocked_badges.sort(key=lambda b: TIER_ORDER.get(b["tier"], 0), reverse=True)

    # Pick the top badge as primary
    primary_badge = unlocked_badges[0] if unlocked_badges else None

    return {
        "unlocked_badges": unlocked_badges,
        "locked_badges": locked_badges,
        "total_badges": len(BADGE_DEFINITIONS),
        "total_unlocked": len(unlocked_badges),
        "primary_badge": primary_badge,
        "all_badges": unlocked_badges + locked_badges,
    }
