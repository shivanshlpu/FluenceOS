from fastapi import APIRouter, Depends
from app.services.auth_service import get_current_user
from app.database import get_db
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/overview")
async def get_overview(user=Depends(get_current_user)):
    """GET /api/dashboard/overview — Dashboard overview stats"""
    pool = get_db()
    user_id = user["id"]

    if pool is None:
        return {"totalSessions": 0, "avgScore": 0, "totalMinutes": 0, "streakDays": 0, "lastScores": [0] * 7}

    async with pool.acquire() as conn:
        # Speaking stats
        stats = await conn.fetchrow(
            """
            SELECT 
                COUNT(*) as total_sessions,
                AVG(overall_score) as avg_score,
                SUM(duration_seconds) / 60.0 as total_minutes
            FROM speaking_sessions
            WHERE user_id = $1
            """, 
            user_id
        )
        
        # Calculate streak (consecutive days with sessions)
        dates = await conn.fetch(
            """
            SELECT DISTINCT date(created_at) as session_date 
            FROM speaking_sessions 
            WHERE user_id = $1 
            AND created_at >= current_date - interval '30 days'
            ORDER BY session_date DESC
            """,
            user_id
        )
        
        streak = 0
        current_date = datetime.utcnow().date()
        date_set = {d["session_date"] for d in dates}
        
        for i in range(30):
            check_date = current_date - timedelta(days=i)
            if check_date in date_set:
                streak += 1
            elif i > 0:
                break
                
        # Last 7 scores for chart
        recent = await conn.fetch(
            """
            SELECT overall_score
            FROM speaking_sessions
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 7
            """,
            user_id
        )
        last_scores = [float(s["overall_score"]) for s in reversed(recent)]

        return {
            "totalSessions": stats["total_sessions"] or 0,
            "avgScore": round(float(stats["avg_score"] or 0), 1),
            "totalMinutes": round(float(stats["total_minutes"] or 0)),
            "streakDays": streak,
            "lastScores": last_scores if last_scores else [0] * 7,
        }


@router.get("/progress-chart")
async def get_progress_chart(days: int = 30, user=Depends(get_current_user)):
    """GET /api/dashboard/progress-chart — Historical progress data"""
    pool = get_db()
    user_id = user["id"]
    
    if pool is None:
        return {"dates": [], "scores": [], "total": 0}
        
    async with pool.acquire() as conn:
        sessions = await conn.fetch(
            """
            SELECT created_at, overall_score
            FROM speaking_sessions
            WHERE user_id = $1 AND created_at >= (now() - $2::interval)
            ORDER BY created_at ASC
            """,
            user_id, f"{days} days"
        )

        return {
            "dates": [s["created_at"].strftime("%b %d") for s in sessions],
            "scores": [float(s["overall_score"]) for s in sessions],
            "total": len(sessions),
        }
