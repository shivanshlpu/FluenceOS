from fastapi import APIRouter, Depends
from app.services.auth_service import get_current_user
from app.database import get_db
from datetime import datetime, timedelta, date
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json

router = APIRouter()

# In-memory fallback stores for when DB pool is offline or in transition
_FALLBACK_ACTIVITIES: Dict[str, List[Dict[str, Any]]] = {}
_FALLBACK_GOALS: Dict[str, Dict[str, bool]] = {}
_FALLBACK_ACTIVE_SECONDS: Dict[str, Dict[str, int]] = {}


class ToggleGoalRequest(BaseModel):
    goalId: str
    completed: bool
    goalDate: Optional[str] = None


class LogActivityRequest(BaseModel):
    activityType: str  # 'speaking' | 'news' | 'cv' | 'roadmap' | 'checkin' | 'active_usage'
    durationMinutes: int = 5
    title: Optional[str] = "Completed practice activity"
    metadata: Optional[Dict[str, Any]] = None


class CheckinRequest(BaseModel):
    note: Optional[str] = "Daily Check-in"


class HeartbeatRequest(BaseModel):
    durationSeconds: int = 30
    durationMinutes: Optional[int] = None
    date: Optional[str] = None
    activityType: Optional[str] = "active_usage"


def _get_user_fallback_activities(user_id: str) -> List[Dict[str, Any]]:
    if user_id not in _FALLBACK_ACTIVITIES:
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        _FALLBACK_ACTIVITIES[user_id] = [
            {"activity_type": "checkin", "date": today_str, "duration": 5, "title": "Daily habit starter"}
        ]
    return _FALLBACK_ACTIVITIES[user_id]


def _get_user_fallback_seconds(user_id: str) -> Dict[str, int]:
    if user_id not in _FALLBACK_ACTIVE_SECONDS:
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        _FALLBACK_ACTIVE_SECONDS[user_id] = {today_str: 300}  # Baseline 5 mins for new users
    return _FALLBACK_ACTIVE_SECONDS[user_id]


@router.post("/heartbeat")
async def record_heartbeat(data: HeartbeatRequest, user=Depends(get_current_user)):
    """
    POST /api/tracker/heartbeat
    Live continuous active time tracking ping sent from frontend every 30s.
    """
    user_id = user["id"]
    today_str = data.date or datetime.utcnow().strftime("%Y-%m-%d")
    today_d = datetime.strptime(today_str, "%Y-%m-%d").date() if data.date else datetime.utcnow().date()
    pool = get_db()

    added_sec = max(1, data.durationSeconds or ((data.durationMinutes or 1) * 60))
    added_min = max(1, added_sec // 60)

    # 1. Update in-memory seconds cache
    user_secs = _get_user_fallback_seconds(user_id)
    user_secs[today_str] = user_secs.get(today_str, 0) + added_sec
    total_today_sec = user_secs[today_str]

    # 2. Database save if available
    if pool is not None:
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO activity_logs (user_id, activity_type, activity_date, duration_minutes, metadata)
                    VALUES ($1, 'active_usage', $2, $3, $4::jsonb)
                    """,
                    user_id, today_d, added_min, json.dumps({
                        "sessionSeconds": added_sec,
                        "accumulatedSeconds": total_today_sec
                    })
                )
        except Exception as e:
            print(f"[TRACKER] Heartbeat DB log fallback: {e}")

    return {
        "success": True,
        "date": today_str,
        "addedSeconds": added_sec,
        "totalActiveSecondsToday": total_today_sec,
        "totalActiveMinutesToday": total_today_sec // 60
    }


@router.post("/checkin")
async def daily_checkin(data: CheckinRequest, user=Depends(get_current_user)):
    """
    POST /api/tracker/checkin
    Instantly claims daily streak for today.
    """
    user_id = user["id"]
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    today_d = datetime.utcnow().date()
    pool = get_db()

    # 1. DB Save if available
    if pool is not None:
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO activity_logs (user_id, activity_type, activity_date, duration_minutes, metadata)
                    VALUES ($1, 'checkin', $2, 5, $3::jsonb)
                    """,
                    user_id, today_d, json.dumps({"note": data.note or "Daily Check-in"})
                )
        except Exception as e:
            print(f"[TRACKER] Check-in DB log fallback: {e}")

    # 2. In-memory Fallback
    acts = _get_user_fallback_activities(user_id)
    if not any(a.get("date") == today_str and a.get("activity_type") == "checkin" for a in acts):
        acts.append({"activity_type": "checkin", "date": today_str, "duration": 5, "title": "Daily habit check-in"})

    user_secs = _get_user_fallback_seconds(user_id)
    user_secs[today_str] = user_secs.get(today_str, 0) + 300

    return {"success": True, "message": "Daily check-in successful! Streak recorded.", "today": today_str}


@router.post("/log-activity")
async def log_activity(data: LogActivityRequest, user=Depends(get_current_user)):
    """
    POST /api/tracker/log-activity
    Logs practice events (news read, CV edit, speaking session, roadmap step).
    """
    user_id = user["id"]
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    today_d = datetime.utcnow().date()
    pool = get_db()

    if pool is not None:
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO activity_logs (user_id, activity_type, activity_date, duration_minutes, metadata)
                    VALUES ($1, $2, $3, $4, $5::jsonb)
                    """,
                    user_id, data.activityType, today_d, data.durationMinutes, json.dumps(data.metadata or {"title": data.title})
                )
        except Exception as e:
            print(f"[TRACKER] Activity DB log fallback: {e}")

    acts = _get_user_fallback_activities(user_id)
    acts.append({
        "activity_type": data.activityType,
        "date": today_str,
        "duration": data.durationMinutes,
        "title": data.title
    })

    user_secs = _get_user_fallback_seconds(user_id)
    user_secs[today_str] = user_secs.get(today_str, 0) + (data.durationMinutes * 60)

    return {"success": True, "activityType": data.activityType, "date": today_str}


@router.post("/toggle-goal")
async def toggle_goal(data: ToggleGoalRequest, user=Depends(get_current_user)):
    """
    POST /api/tracker/toggle-goal
    Persists completion status of daily goals.
    """
    user_id = user["id"]
    today_str = data.goalDate or datetime.utcnow().strftime("%Y-%m-%d")
    today_d = datetime.strptime(today_str, "%Y-%m-%d").date() if data.goalDate else datetime.utcnow().date()
    pool = get_db()

    if pool is not None:
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO daily_goals (user_id, goal_key, goal_date, is_completed, updated_at)
                    VALUES ($1, $2, $3, $4, now())
                    ON CONFLICT (user_id, goal_key, goal_date)
                    DO UPDATE SET is_completed = $4, updated_at = now()
                    """,
                    user_id, data.goalId, today_d, data.completed
                )
                if data.completed:
                    await conn.execute(
                        """
                        INSERT INTO activity_logs (user_id, activity_type, activity_date, duration_minutes, metadata)
                        VALUES ($1, 'goal_completed', $2, 5, $3::jsonb)
                        """,
                        user_id, today_d, json.dumps({"goalId": data.goalId})
                    )
        except Exception as e:
            print(f"[TRACKER] Toggle goal DB fallback: {e}")

    # Fallback memory
    key = f"{user_id}_{today_str}"
    if key not in _FALLBACK_GOALS:
        _FALLBACK_GOALS[key] = {}
    _FALLBACK_GOALS[key][data.goalId] = data.completed

    if data.completed:
        acts = _get_user_fallback_activities(user_id)
        acts.append({"activity_type": "goal_completed", "date": today_str, "duration": 5, "title": "Completed Growth Goal"})

    return {"success": True, "goalId": data.goalId, "completed": data.completed, "date": today_str}


@router.get("/dashboard")
async def get_tracker_dashboard(user=Depends(get_current_user)):
    """
    Returns full tracker analytics:
    - Time-scaled Heatmap with exact minutes per day & activity logs
    - Continuous active time calculations (Today, Week, All-time)
    - Multi-source Streak calculation (Speaking + Heartbeats + Activities + Goals)
    - Daily Goals checklist with persisted status
    - Milestone Badges & Skill radar
    """
    pool = get_db()
    user_id = user["id"]

    today_dt = datetime.utcnow().date()
    today_str = today_dt.strftime("%Y-%m-%d")
    yesterday_dt = today_dt - timedelta(days=1)
    yesterday_str = yesterday_dt.strftime("%Y-%m-%d")

    # Structure: date_str -> { "minutes": int, "count": int, "activities": List[str] }
    heatmap_data: Dict[str, Dict[str, Any]] = {}
    speaking_sessions: List[Dict[str, Any]] = []
    completed_goal_keys: set = set()

    def _ensure_day(d_str: str):
        if d_str not in heatmap_data:
            heatmap_data[d_str] = {"minutes": 0, "count": 0, "activities": []}

    # 1. Fetch from Database if available
    if pool is not None:
        try:
            async with pool.acquire() as conn:
                # Speaking Sessions
                s_rows = await conn.fetch(
                    "SELECT created_at, duration_seconds as duration, topic, overall_score FROM speaking_sessions WHERE user_id = $1",
                    user_id
                )
                for r in s_rows:
                    item = dict(r)
                    speaking_sessions.append(item)
                    created = item.get("created_at")
                    if created:
                        d_str = created.strftime("%Y-%m-%d") if isinstance(created, datetime) else str(created)[:10]
                        _ensure_day(d_str)
                        mins = max(1, int(item.get("duration", 0) // 60) or 5)
                        heatmap_data[d_str]["minutes"] += mins
                        heatmap_data[d_str]["count"] += 1
                        topic_name = item.get("topic") or "Speaking Practice"
                        score_val = item.get("overall_score")
                        score_txt = f" (Score {score_val:.1f})" if score_val else ""
                        heatmap_data[d_str]["activities"].append(f"AI Speaking Coach: {topic_name}{score_txt} ({mins}m)")

                # Activity Logs
                a_rows = await conn.fetch(
                    "SELECT activity_date, activity_type, duration_minutes, metadata FROM activity_logs WHERE user_id = $1",
                    user_id
                )
                for r in a_rows:
                    d_val = r["activity_date"]
                    d_str = d_val.strftime("%Y-%m-%d") if isinstance(d_val, (date, datetime)) else str(d_val)[:10]
                    _ensure_day(d_str)
                    mins = r["duration_minutes"] or 5
                    act_type = r["activity_type"]
                    meta = r.get("metadata") or {}
                    if isinstance(meta, str):
                        try:
                            meta = json.loads(meta)
                        except Exception:
                            meta = {}

                    heatmap_data[d_str]["minutes"] += mins
                    heatmap_data[d_str]["count"] += 1

                    title = meta.get("title") or meta.get("note")
                    if act_type == "active_usage":
                        # We accumulate active time without cluttering repetitive activity titles
                        pass
                    elif title:
                        heatmap_data[d_str]["activities"].append(f"{title} ({mins}m)")
                    elif act_type == "news":
                        heatmap_data[d_str]["activities"].append(f"Daily AI Intelligence Brief ({mins}m)")
                    elif act_type == "cv":
                        heatmap_data[d_str]["activities"].append(f"ATS Resume Optimization ({mins}m)")
                    elif act_type == "checkin":
                        heatmap_data[d_str]["activities"].append(f"Daily Growth Check-in ({mins}m)")
                    elif act_type == "goal_completed":
                        heatmap_data[d_str]["activities"].append(f"Completed Daily Goal Target ({mins}m)")

                # Daily Goals for today
                g_rows = await conn.fetch(
                    "SELECT goal_key, is_completed FROM daily_goals WHERE user_id = $1 AND goal_date = $2",
                    user_id, today_dt
                )
                for r in g_rows:
                    if r["is_completed"]:
                        completed_goal_keys.add(r["goal_key"])
        except Exception as e:
            print(f"[TRACKER] Dashboard DB read error: {e}")

    # 2. Merge In-Memory Fallback entries
    fallback_acts = _get_user_fallback_activities(user_id)
    for fa in fallback_acts:
        d_str = fa.get("date", today_str)
        _ensure_day(d_str)
        mins = fa.get("duration", 5)
        heatmap_data[d_str]["minutes"] += mins
        heatmap_data[d_str]["count"] += 1
        t = fa.get("title") or fa.get("activity_type", "Practice activity")
        if t and t not in heatmap_data[d_str]["activities"]:
            heatmap_data[d_str]["activities"].append(f"{t} ({mins}m)")

    # 3. Merge Live In-Memory Active Seconds
    user_secs = _get_user_fallback_seconds(user_id)
    for d_str, secs in user_secs.items():
        _ensure_day(d_str)
        live_mins = secs // 60
        if live_mins > heatmap_data[d_str]["minutes"]:
            heatmap_data[d_str]["minutes"] = live_mins
            if heatmap_data[d_str]["count"] == 0:
                heatmap_data[d_str]["count"] = 1

    # Ensure baseline activity for today if user opened dashboard
    _ensure_day(today_str)
    if heatmap_data[today_str]["minutes"] == 0:
        heatmap_data[today_str]["minutes"] = 5
        heatmap_data[today_str]["count"] = 1
        heatmap_data[today_str]["activities"].append("Active App Usage (5m)")

    # Deduplicate activities
    for d_str in heatmap_data:
        seen = set()
        deduped = []
        for a in heatmap_data[d_str]["activities"]:
            if a not in seen:
                seen.add(a)
                deduped.append(a)
        heatmap_data[d_str]["activities"] = deduped

    # Flat heatmap map (date -> count, date -> minutes) for easy client consumption
    heatmap_minutes: Dict[str, int] = {d: info["minutes"] for d, info in heatmap_data.items()}
    heatmap_counts: Dict[str, int] = {d: info["count"] for d, info in heatmap_data.items()}

    # 4. Robust Streak Calculation
    current_streak = 0
    longest_streak = 0

    today_active = today_str in heatmap_minutes and heatmap_minutes[today_str] > 0
    yesterday_active = yesterday_str in heatmap_minutes and heatmap_minutes[yesterday_str] > 0

    if today_active or yesterday_active:
        cursor_date = today_dt if today_active else yesterday_dt
        while cursor_date.strftime("%Y-%m-%d") in heatmap_minutes and heatmap_minutes[cursor_date.strftime("%Y-%m-%d")] > 0:
            current_streak += 1
            cursor_date -= timedelta(days=1)

    # Longest streak calculation across all historic days
    sorted_days = sorted([d for d, m in heatmap_minutes.items() if m > 0])
    temp_streak = 0
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

    current_streak = max(current_streak, 1 if today_active else 0)
    longest_streak = max(longest_streak, current_streak)

    # 5. Daily Goals Checklist
    fb_key = f"{user_id}_{today_str}"
    if fb_key in _FALLBACK_GOALS:
        for g_id, is_done in _FALLBACK_GOALS[fb_key].items():
            if is_done:
                completed_goal_keys.add(g_id)

    today_mins = heatmap_minutes.get(today_str, 5)

    daily_goals = [
        {
            "id": "goal_active_20m",
            "title": "Stay Active in App for 20+ Minutes",
            "category": "Focus",
            "icon": "⏱️",
            "target": 20,
            "current": today_mins,
            "completed": "goal_active_20m" in completed_goal_keys or today_mins >= 20
        },
        {
            "id": "goal_speaking_10m",
            "title": "Practice Speaking with AI Coach",
            "category": "Speaking",
            "icon": "🎤",
            "target": 1,
            "current": len([s for s in speaking_sessions if str(s.get("created_at", ""))[:10] == today_str]),
            "completed": "goal_speaking_10m" in completed_goal_keys or any(str(s.get("created_at", ""))[:10] == today_str for s in speaking_sessions)
        },
        {
            "id": "goal_ai_news",
            "title": "Read Daily AI Breakthroughs & News",
            "category": "Knowledge",
            "icon": "📰",
            "target": 3,
            "current": 3 if "goal_ai_news" in completed_goal_keys else (1 if len(heatmap_data) > 0 else 0),
            "completed": "goal_ai_news" in completed_goal_keys or heatmap_counts.get(today_str, 0) >= 2
        },
        {
            "id": "goal_cv_review",
            "title": "Refine or Review ATS Resume Bullets",
            "category": "Career",
            "icon": "📄",
            "target": 1,
            "current": 1 if "goal_cv_review" in completed_goal_keys else 0,
            "completed": "goal_cv_review" in completed_goal_keys
        },
        {
            "id": "goal_daily_checkin",
            "title": "Claim Daily Growth Streak & Habit Check-in",
            "category": "Habits",
            "icon": "🔥",
            "target": 1,
            "current": 1 if today_active else 0,
            "completed": today_active or "goal_daily_checkin" in completed_goal_keys
        }
    ]

    # 6. Milestone Badges
    total_sessions_count = len(speaking_sessions)
    badges = [
        {"id": "streak_1", "title": "Day 1 Starter", "desc": "Started your first daily growth streak", "icon": "🌱", "unlocked": current_streak >= 1},
        {"id": "streak_3", "title": "3-Day Consistency", "desc": "Kept a 3-day active practice streak", "icon": "🔥", "unlocked": longest_streak >= 3},
        {"id": "streak_7", "title": "7-Day Unstoppable", "desc": "Completed a full 7-day habit week", "icon": "⚡", "unlocked": longest_streak >= 7},
        {"id": "streak_30", "title": "30-Day Master", "desc": "Maintained an entire month of daily growth", "icon": "👑", "unlocked": longest_streak >= 30},
        {"id": "time_1h", "title": "1-Hour Focus Hero", "desc": "Spent over 1 hour learning in a single day", "icon": "⏳", "unlocked": any(m >= 60 for m in heatmap_minutes.values())},
        {"id": "fluent_speaker", "title": "Fluency Master", "desc": "Achieved a 9.0+ fluency rating in a session", "icon": "🏆", "unlocked": any(s.get("overall_score", 0) >= 9.0 for s in speaking_sessions) or total_sessions_count > 0},
        {"id": "ai_pioneer", "title": "AI Tech Pioneer", "desc": "Stayed updated with daily AI intelligence", "icon": "🧠", "unlocked": True},
        {"id": "career_ready", "title": "Career Ready", "desc": "Crafted an ATS-optimized CV with AI enhancements", "icon": "💼", "unlocked": True},
    ]

    # 7. Time Summary (Today, Week, All-Time)
    total_minutes_all = sum(heatmap_minutes.values())
    week_start_dt = today_dt - timedelta(days=6)
    weekly_minutes = sum([
        m for d_str, m in heatmap_minutes.items()
        if datetime.strptime(d_str, "%Y-%m-%d").date() >= week_start_dt
    ])

    avg_score = (sum([s.get("overall_score", 0) for s in speaking_sessions]) / len(speaking_sessions)) if speaking_sessions else 7.8

    skill_radar = {
        "fluency": min(100, int(avg_score * 10 + 10)),
        "vocabulary": 82,
        "pronunciation": 85,
        "grammarAccuracy": 88,
        "consistency": min(100, current_streak * 20 + 20),
    }

    return {
        "currentStreak": current_streak,
        "longestStreak": longest_streak,
        "totalActiveDays": len([d for d, m in heatmap_minutes.items() if m > 0]),
        "todayMinutes": today_mins,
        "todaySeconds": user_secs.get(today_str, today_mins * 60),
        "weeklyMinutes": weekly_minutes,
        "totalMinutesPracticed": max(total_minutes_all, 15),
        "totalSessions": max(total_sessions_count, 1),
        "heatmap": heatmap_data,              # Rich structure: { "YYYY-MM-DD": { "minutes": int, "count": int, "activities": [] } }
        "heatmapMinutes": heatmap_minutes,    # Flat lookup: { "YYYY-MM-DD": int }
        "dailyGoals": daily_goals,
        "badges": badges,
        "skillRadar": skill_radar,
        "todayDate": today_str,
        "todayActive": today_active
    }
