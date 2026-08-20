from fastapi import APIRouter, Depends
from app.services.auth_service import get_current_user
from app.database import get_db
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/overview")
async def get_overview(user=Depends(get_current_user)):
    """GET /api/dashboard/overview — Dashboard overview stats"""
    db = get_db()
    user_id = user["_id"]

    # Speaking stats
    speaking_pipeline = [
        {"$match": {"userId": user_id}},
        {"$group": {
            "_id": None,
            "totalSessions": {"$sum": 1},
            "avgScore": {"$avg": "$evaluation.overallScore"},
            "totalMinutes": {"$sum": {"$divide": ["$duration", 60]}},
        }}
    ]
    speaking_stats = await db.speaking_sessions.aggregate(speaking_pipeline).to_list(1)
    speaking = speaking_stats[0] if speaking_stats else {"totalSessions": 0, "avgScore": 0, "totalMinutes": 0}

    # Calculate streak (consecutive days with sessions)
    streak = 0
    current_date = datetime.utcnow().date()
    for i in range(30):
        check_date = current_date - timedelta(days=i)
        session = await db.speaking_sessions.find_one({
            "userId": user_id,
            "createdAt": {
                "$gte": datetime.combine(check_date, datetime.min.time()),
                "$lt": datetime.combine(check_date + timedelta(days=1), datetime.min.time()),
            }
        })
        if session:
            streak += 1
        elif i > 0:
            break

    # Last 7 scores for chart
    recent = await db.speaking_sessions.find(
        {"userId": user_id},
        sort=[("createdAt", -1)],
        limit=7
    ).to_list(7)
    last_scores = [s.get("evaluation", {}).get("overallScore", 0) for s in reversed(recent)]

    return {
        "totalSessions": speaking.get("totalSessions", 0),
        "avgScore": round(speaking.get("avgScore", 0) or 0, 1),
        "totalMinutes": round(speaking.get("totalMinutes", 0) or 0),
        "streakDays": streak,
        "lastScores": last_scores if last_scores else [0] * 7,
    }


@router.get("/progress-chart")
async def get_progress_chart(days: int = 30, user=Depends(get_current_user)):
    """GET /api/dashboard/progress-chart — Historical progress data"""
    db = get_db()
    user_id = user["_id"]
    since = datetime.utcnow() - timedelta(days=days)

    cursor = db.speaking_sessions.find(
        {"userId": user_id, "createdAt": {"$gte": since}},
        sort=[("createdAt", 1)]
    )
    sessions = await cursor.to_list(100)

    return {
        "dates": [s["createdAt"].strftime("%b %d") for s in sessions],
        "scores": [s.get("evaluation", {}).get("overallScore", 0) for s in sessions],
        "total": len(sessions),
    }
