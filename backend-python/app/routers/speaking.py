from fastapi import APIRouter, Depends, UploadFile, File
from app.models.session import SpeakingRequest
from app.services.ai_service import (
    evaluate_speech,
    generate_topic_explanation,
    generate_reading_paragraph,
    evaluate_reading,
    chat_speaking_coach,
    transcribe_audio,
    AVAILABLE_MODELS
)
from app.services.auth_service import get_optional_user
from app.database import get_db
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import uuid

router = APIRouter()


class ReadingEvalRequest(BaseModel):
    topic: str
    originalParagraph: str
    spokenText: str
    duration: int = 0
    model: Optional[str] = "auto"
    sttConfidence: Optional[float] = 1.0
    audioQualityMetrics: Optional[dict] = None


class VoiceChatRequest(BaseModel):
    messages: list
    scenario: str = "Tech Job Interview"
    difficulty: str = "Intermediate"
    model: Optional[str] = "auto"


@router.get("/models")
async def get_models():
    """GET /api/speaking/models — List of verified active AI models available for selection"""
    return AVAILABLE_MODELS


@router.get("/generate-topic")
async def get_topic_explanation(
    topic: str,
    model: Optional[str] = "auto",
    angle: Optional[str] = None,
    seed: Optional[int] = None,
    user=Depends(get_optional_user)
):
    """GET /api/speaking/generate-topic?topic=...&model=...&angle=...&seed=..."""
    res = await generate_topic_explanation(topic, model=model or "auto", angle=angle, seed=seed)
    return {
        "topic": topic,
        "explanation": res.get("explanation", ""),
        "breakdown": res
    }


@router.post("/evaluate")
async def evaluate_speaking_session(data: SpeakingRequest, user=Depends(get_optional_user)):
    """POST /api/speaking/evaluate — Core evaluation endpoint"""
    evaluation = await evaluate_speech(data.transcript, data.topic, model=data.model or "auto")
    session_id = str(uuid.uuid4())


    pool = get_db()
    if pool and user:
        try:
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
                if row:
                    session_id = str(row["id"])
        except Exception as e:
            print(f"[SPEAKING] DB Save error: {e}")

    return {"sessionId": session_id, "evaluation": evaluation}


@router.get("/history")
async def get_speaking_history(limit: int = 10, user=Depends(get_optional_user)):
    """GET /api/speaking/history — Last N sessions"""
    if not user:
        return []

    pool = get_db()
    if not pool:
        return []

    try:
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
                    try:
                        s_dict["evaluation"] = json.loads(s_dict["evaluation"])
                    except Exception:
                        pass
                    
                result.append(s_dict)
                
            return result
    except Exception as e:
        print(f"[SPEAKING] History fetch error: {e}")
        return []


@router.get("/stats")
async def get_speaking_stats(user=Depends(get_optional_user)):
    """GET /api/speaking/stats — Aggregated progress data for dashboard"""
    default_stats = {
        "avgScore": 7.5,
        "totalSessions": 0,
        "totalMinutes": 0,
        "lastScore": 7.5,
        "sessionScores": [],
        "recentSessions": [],
        "topMistakes": []
    }

    if not user:
        return default_stats

    pool = get_db()
    if not pool:
        return default_stats

    try:
        async with pool.acquire() as conn:
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
            
            last_score = session_scores[-1]["score"] if session_scores else 7.5
            recent_sessions = session_scores[-5:] if len(session_scores) >= 5 else session_scores
            
            mistakes_raw = await conn.fetch(
                """
                SELECT mistake->>'mistake' as mistake_text, COUNT(*) as count
                FROM speaking_sessions, jsonb_array_elements(COALESCE(evaluation->'grammarMistakes', '[]'::jsonb)) as mistake
                WHERE user_id = $1
                GROUP BY mistake->>'mistake'
                ORDER BY count DESC
                LIMIT 5
                """,
                user["id"]
            )
            
            top_mistakes = [{"mistake": m["mistake_text"], "count": m["count"]} for m in mistakes_raw if m["mistake_text"]]

            return {
                "avgScore": round(float(stats["avg_score"] or 7.5), 1),
                "totalSessions": stats["total_sessions"] or 0,
                "totalMinutes": round(float(stats["total_minutes"] or 0)),
                "lastScore": float(last_score),
                "sessionScores": session_scores,
                "recentSessions": recent_sessions,
                "topMistakes": top_mistakes,
            }
    except Exception as e:
        print(f"[SPEAKING] Stats fetch error: {e}")
        return default_stats


@router.get("/reading/paragraph")
async def get_reading_paragraph(
    topic: str,
    level: str = "beginner",
    model: Optional[str] = "auto",
    angle: Optional[str] = None,
    user=Depends(get_optional_user)
):
    """GET /api/speaking/reading/paragraph?topic=...&level=beginner&model=...&angle=..."""
    return await generate_reading_paragraph(topic, level, model=model or "auto", angle=angle)


@router.post("/reading/evaluate")
async def evaluate_reading_session(data: ReadingEvalRequest, user=Depends(get_optional_user)):
    """POST /api/speaking/reading/evaluate"""
    evaluation = await evaluate_reading(
        original_paragraph=data.originalParagraph,
        spoken_text=data.spokenText,
        topic=data.topic,
        duration=data.duration,
        model=data.model or "auto",
        audio_quality_metrics=data.audioQualityMetrics
    )
    session_id = str(uuid.uuid4())

    pool = get_db()
    if pool and user and evaluation.get("isAcceptable", True):
        try:
            eval_json = {
                "overallScore": evaluation.get("overallScore", 0),
                "accuracyScore": evaluation.get("accuracyScore", 0),
                "pronunciationScore": evaluation.get("pronunciationScore", 0),
                "fluencyScore": evaluation.get("fluencyScore", 0),
                "paceScore": evaluation.get("paceScore", 0),
                "pauseScore": evaluation.get("pauseScore", 0),
                "vocabularyScore": evaluation.get("vocabularyScore", 0),
                "detailedFeedback": evaluation.get("detailedFeedback", ""),
                "strengths": evaluation.get("strengths", []),
                "improvements": evaluation.get("improvements", []),
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
                if row:
                    session_id = str(row["id"])
        except Exception as e:
            print(f"[SPEAKING] Reading save error: {e}")

    return {"sessionId": session_id, "evaluation": evaluation}


@router.post("/chat")
async def voice_chat_turn(data: VoiceChatRequest, user=Depends(get_optional_user)):
    """POST /api/speaking/chat — Real-time 2-way AI voice coach"""
    return await chat_speaking_coach(data.messages, data.scenario, data.difficulty, model=data.model or "auto")


@router.post("/transcribe")
async def transcribe_spoken_audio(file: UploadFile = File(...), user=Depends(get_optional_user)):
    """POST /api/speaking/transcribe — Groq Whisper Large v3 Turbo audio transcription with confidence"""
    content = await file.read()
    res = await transcribe_audio(content, file.filename or "audio.webm")
    if isinstance(res, dict):
        return res
    return {"transcript": str(res), "confidence": 0.95}


