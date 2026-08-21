from fastapi import APIRouter, Depends
from app.models.session import SpeakingRequest
from app.services.ai_service import evaluate_speech, generate_topic_explanation, generate_reading_paragraph, evaluate_reading
from app.services.auth_service import get_current_user
from app.database import get_db
from datetime import datetime
from pydantic import BaseModel
import json

router = APIRouter()


class ReadingEvalRequest(BaseModel):
    topic: str
    originalParagraph: str
    spokenText: str
    duration: int = 0


@router.get("/generate-topic")
async def get_topic_explanation(topic: str, user=Depends(get_current_user)):
    """GET /api/speaking/generate-topic?topic=Machine+Learning"""
    explanation = await generate_topic_explanation(topic)
    return {"topic": topic, "explanation": explanation}


@router.post("/evaluate")
async def evaluate_speaking_session(data: SpeakingRequest, user=Depends(get_current_user)):
    """POST /api/speaking/evaluate — Core evaluation endpoint"""
    pool = get_db()
    if not pool:
        return {"sessionId": "error", "evaluation": {}}

    # Run AI evaluation
    evaluation = await evaluate_speech(data.transcript, data.topic)

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO speaking_sessions 
            (user_id, topic, transcript, duration_seconds, word_count, overall_score, fluency_score, cefr_level, evaluation, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, now())
            RETURNING id
            """,
            user["id"],
            data.topic,
            data.transcript,
            data.duration,
            len(data.transcript.split()),
            evaluation.get("overallScore", 0),
            evaluation.get("fluencyScore", 0),
            evaluation.get("cefrLevel", "B1"),
            json.dumps(evaluation)
        )

    return {"sessionId": str(row["id"]), "evaluation": evaluation}


@router.get("/history")
async def get_speaking_history(limit: int = 10, user=Depends(get_current_user)):
    """GET /api/speaking/history — Last N sessions"""
    pool = get_db()
    if not pool:
        return []
        
    async with pool.acquire() as conn:
        sessions = await conn.fetch(
            """
            SELECT id, user_id, topic, session_type as type, transcript, duration_seconds as duration, 
                   word_count as "wordCount", created_at as "createdAt", evaluation
            FROM speaking_sessions
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            """,
            user["id"], limit
        )
        
        result = []
        for s in sessions:
            s_dict = dict(s)
            s_dict["_id"] = str(s_dict.pop("id"))
            s_dict["userId"] = str(s_dict.pop("user_id"))
            
            if isinstance(s_dict["evaluation"], str):
                s_dict["evaluation"] = json.loads(s_dict["evaluation"])
                
            result.append(s_dict)
            
        return result


@router.get("/stats")
async def get_speaking_stats(user=Depends(get_current_user)):
    """GET /api/speaking/stats — Aggregated progress data for dashboard"""
    pool = get_db()
    if not pool:
        return {"avgScore": 0, "totalSessions": 0, "totalMinutes": 0, "lastScore": 0, "sessionScores": [], "recentSessions": [], "topMistakes": []}

    async with pool.acquire() as conn:
        # Aggregate totals
        stats = await conn.fetchrow(
            """
            SELECT 
                AVG(overall_score) as avg_score,
                COUNT(*) as total_sessions,
                SUM(duration_seconds) / 60.0 as total_minutes
            FROM speaking_sessions
            WHERE user_id = $1
            """,
            user["id"]
        )

        # Last 10 session scores
        recent = await conn.fetch(
            """
            SELECT id, topic, overall_score, created_at
            FROM speaking_sessions
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 10
            """,
            user["id"]
        )
        
        session_scores = [
            {
                "score": float(s["overall_score"] or 0),
                "topic": s["topic"] or "",
                "date": s["created_at"].isoformat() if s["created_at"] else "",
                "id": str(s["id"])
            }
            for s in reversed(recent)
        ]
        
        last_score = session_scores[-1]["score"] if session_scores else 0
        recent_sessions = session_scores[-5:] if len(session_scores) >= 5 else session_scores
        
        # Top grammar mistakes
        mistakes_raw = await conn.fetch(
            """
            SELECT mistake->>'mistake' as mistake_text, COUNT(*) as count
            FROM speaking_sessions, jsonb_array_elements(evaluation->'grammarMistakes') as mistake
            WHERE user_id = $1
            GROUP BY mistake->>'mistake'
            ORDER BY count DESC
            LIMIT 5
            """,
            user["id"]
        )
        
        top_mistakes = [{"mistake": m["mistake_text"], "count": m["count"]} for m in mistakes_raw if m["mistake_text"]]

        return {
            "avgScore": round(float(stats["avg_score"] or 0), 1),
            "totalSessions": stats["total_sessions"] or 0,
            "totalMinutes": round(float(stats["total_minutes"] or 0)),
            "lastScore": float(last_score),
            "sessionScores": session_scores,
            "recentSessions": recent_sessions,
            "topMistakes": top_mistakes,
        }


@router.get("/reading/paragraph")
async def get_reading_paragraph(topic: str, level: str = "beginner", user=Depends(get_current_user)):
    """GET /api/speaking/reading/paragraph?topic=...&level=beginner"""
    data = await generate_reading_paragraph(topic, level)
    return data


@router.post("/reading/evaluate")
async def evaluate_reading_session(data: ReadingEvalRequest, user=Depends(get_current_user)):
    """POST /api/speaking/reading/evaluate"""
    pool = get_db()
    if not pool:
        return {"sessionId": "error", "evaluation": {}}

    evaluation = await evaluate_reading(data.originalParagraph, data.spokenText, data.topic)
    
    eval_json = {
        "overallScore": evaluation.get("overallScore", 0),
        "fluencyScore": evaluation.get("fluencyScore", 0),
        "confidenceScore": evaluation.get("accuracyScore", 0),
        "detailedFeedback": evaluation.get("detailedFeedback", ""),
        "strengths": evaluation.get("strengths", []),
        "improvements": evaluation.get("improvements", []),
        "grammarMistakes": [],
        "vocabularySuggestions": [],
        "originalParagraph": data.originalParagraph
    }

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO speaking_sessions 
            (user_id, topic, session_type, transcript, duration_seconds, word_count, overall_score, fluency_score, evaluation, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, now())
            RETURNING id
            """,
            user["id"],
            data.topic,
            "reading",
            data.spokenText,
            data.duration,
            len(data.spokenText.split()),
            evaluation.get("overallScore", 0),
            evaluation.get("fluencyScore", 0),
            json.dumps(eval_json)
        )

    return {"sessionId": str(row["id"]), "evaluation": evaluation}


class VoiceChatRequest(BaseModel):
    messages: list
    scenario: str = "Tech Job Interview"
    difficulty: str = "Intermediate"


@router.post("/chat")
async def voice_chat_turn(data: VoiceChatRequest, user=Depends(get_current_user)):
    """POST /api/speaking/chat"""
    from app.services.ai_service import chat_speaking_coach
    result = await chat_speaking_coach(data.messages, data.scenario, data.difficulty)
    return result
