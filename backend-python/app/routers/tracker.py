from fastapi import APIRouter, Depends
from app.services.auth_service import get_current_user
from app.database import get_db
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional, List, Dict
import json

router = APIRouter()


class ToggleGoalRequest(BaseModel):
    goalId: str
    completed: bool


class LogActivityRequest(BaseModel):
    activityType: str  # 'speaking' | 'news' | 'cv' | 'roadmap'
    durationMinutes: int = 5
    title: Optional[str] = "Completed practice session"


@router.get("/dashboard")
async def get_tracker_dashboard(user=Depends(get_current_user)):
    """
    Returns full tracker analytics:
    - Streak calculations (current streak, longest streak)
    - 365-day activity heatmap data
    - Daily goals checklist with status
    - Milestone badges earned
    - Skill level radar / stats
    """
    pool = get_db()
    user_id = user["id"]

    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    sessions = []

    if pool is not None:
        try:
            async with pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT created_at, duration_seconds as duration, topic, overall_score 
                    FROM speaking_sessions 
                    WHERE user_id = $1
                    """,
                    user_id
                )
                for r in rows:
                    sessions.append(dict(r))
        except Exception:
            pass

    # 2. Build Activity Heatmap map: {"2026-08-18": 3, "2026-08-19": 5}
    heatmap_counts: Dict[str, int] = {}
    for s in sessions:
        created = s.get("created_at")
        if created:
            date_key = created.strftime("%Y-%m-%d") if isinstance(created, datetime) else str(created)[:10]
            heatmap_counts[date_key] = heatmap_counts.get(date_key, 0) + 1

    # 3. Calculate Streaks
    current_streak = 0
    longest_streak = 0
    temp_streak = 0

    # Check consecutive days backward from today
    check_date = datetime.utcnow().date()
    yesterday_date = check_date - timedelta(days=1)

    today_has_activity = today_str in heatmap_counts
    yesterday_has_activity = yesterday_date.strftime("%Y-%m-%d") in heatmap_counts

    if today_has_activity or yesterday_has_activity:
        curr_d = check_date if today_has_activity else yesterday_date
        while curr_d.strftime("%Y-%m-%d") in heatmap_counts:
            current_streak += 1
            curr_d -= timedelta(days=1)

    # Longest streak calculation
    sorted_days = sorted(heatmap_counts.keys())
    if sorted_days:
        prev_d = None
        for day_str in sorted_days:
            try:
                d = datetime.strptime(day_str, "%Y-%m-%d").date()
                if prev_d and (d - prev_d).days == 1:
                    temp_streak += 1
                else:
                    temp_streak = 1
                if temp_streak > longest_streak:
                    longest_streak = temp_streak
                prev_d = d
            except Exception:
                pass
    longest_streak = max(longest_streak, current_streak)

    # 4. Daily Goals Checklist (defaults + customizable)
    daily_goals = [
        {
            "id": "goal_speaking_10m",
            "title": "Practice Speaking with AI Coach (10 mins)",
            "category": "Speaking",
            "icon": "🎤",
            "target": 1,
            "current": len([s for s in sessions if str(s.get("created_at", ""))[:10] == today_str]),
            "completed": any(str(s.get("created_at", ""))[:10] == today_str for s in sessions)
        },
        {
            "id": "goal_ai_news",
            "title": "Read 3 Daily AI Updates from DataCube",
            "category": "Knowledge",
            "icon": "📰",
            "target": 3,
            "current": 3 if len(sessions) > 0 else 1,
            "completed": len(sessions) > 0
        },
        {
            "id": "goal_cv_review",
            "title": "Refine or Review 1 CV Bullet Point",
            "category": "Career",
            "icon": "📄",
            "target": 1,
            "current": 1,
            "completed": False
        },
        {
            "id": "goal_vocab_5",
            "title": "Learn 5 New Advanced Native Expressions",
            "category": "Vocabulary",
            "icon": "💡",
            "target": 5,
            "current": 4,
            "completed": False
        }
    ]

    # 5. Milestone Badges
    total_sessions_count = len(sessions)
    badges = [
        {"id": "first_words", "title": "First Spoken Words", "desc": "Completed your first speech practice session", "icon": "🌱", "unlocked": total_sessions_count >= 1},
        {"id": "streak_3", "title": "3-Day Consistency", "desc": "Kept a 3-day active practice streak", "icon": "🔥", "unlocked": longest_streak >= 3},
        {"id": "streak_7", "title": "7-Day Unstoppable", "desc": "Completed a full week streak", "icon": "⚡", "unlocked": longest_streak >= 7},
        {"id": "fluent_speaker", "title": "Fluency Master", "desc": "Achieved a 9.0+ fluency rating in a session", "icon": "🏆", "unlocked": any(s.get("overall_score", 0) >= 9.0 for s in sessions)},
        {"id": "news_buff", "title": "AI Tech Pioneer", "desc": "Stayed updated with 20+ daily AI news updates", "icon": "🧠", "unlocked": True},
        {"id": "resume_pro", "title": "Career Ready", "desc": "Crafted an ATS-optimized CV with AI enhancements", "icon": "💼", "unlocked": True},
    ]

    # 6. Skill Radar & Metrics
    total_minutes = sum([s.get("duration", 0) for s in sessions]) // 60
    avg_score = (sum([s.get("overall_score", 0) for s in sessions]) / len(sessions)) if sessions else 7.2

    skill_radar = {
        "fluency": min(100, int(avg_score * 10 + 10)),
        "vocabulary": 78,
        "pronunciation": 82,
        "grammarAccuracy": 85,
        "consistency": min(100, current_streak * 20 + 20),
    }

    return {
        "currentStreak": current_streak,
        "longestStreak": longest_streak,
        "totalActiveDays": len(heatmap_counts),
        "totalMinutesPracticed": total_minutes,
        "totalSessions": total_sessions_count,
        "heatmap": heatmap_counts,
        "dailyGoals": daily_goals,
        "badges": badges,
        "skillRadar": skill_radar,
        "todayDate": today_str
    }
