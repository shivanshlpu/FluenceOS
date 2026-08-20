from fastapi import APIRouter, Depends
from app.models.session import SpeakingRequest
from app.services.ai_service import evaluate_speech, generate_topic_explanation, generate_reading_paragraph, evaluate_reading
from app.services.auth_service import get_current_user
from app.database import get_db
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel

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
    db = get_db()

    # Run AI evaluation
    evaluation = await evaluate_speech(data.transcript, data.topic)

    # Save to MongoDB
    session = {
        "userId": user["_id"],
        "topic": data.topic,
        "transcript": data.transcript,
        "evaluation": evaluation,
        "duration": data.duration,
        "wordCount": len(data.transcript.split()),
        "createdAt": datetime.utcnow(),
    }
    result = await db.speaking_sessions.insert_one(session)

    return {"sessionId": str(result.inserted_id), "evaluation": evaluation}


@router.get("/history")
async def get_speaking_history(limit: int = 10, user=Depends(get_current_user)):
    """GET /api/speaking/history — Last N sessions"""
    db = get_db()
    cursor = db.speaking_sessions.find(
        {"userId": user["_id"]},
        sort=[("createdAt", -1)],
        limit=limit
    )
    sessions = await cursor.to_list(length=limit)

    # Convert ObjectIds to strings
    for s in sessions:
        s["_id"] = str(s["_id"])
        s["userId"] = str(s["userId"]) if isinstance(s.get("userId"), ObjectId) else s.get("userId")

    return sessions


@router.get("/stats")
async def get_speaking_stats(user=Depends(get_current_user)):
    """GET /api/speaking/stats — Aggregated progress data for dashboard"""
    db = get_db()

    # Aggregate totals
    pipeline = [
        {"$match": {"userId": user["_id"]}},
        {"$group": {
            "_id": None,
            "avgScore": {"$avg": "$evaluation.overallScore"},
            "totalSessions": {"$sum": 1},
            "totalMinutes": {"$sum": {"$divide": ["$duration", 60]}},
            "lastScore": {"$last": "$evaluation.overallScore"},
        }}
    ]
    stats = await db.speaking_sessions.aggregate(pipeline).to_list(1)
    base = stats[0] if stats else {
        "avgScore": 0,
        "totalSessions": 0,
        "totalMinutes": 0,
        "lastScore": 0,
    }

    # Last 5 session scores (for line chart)
    score_cursor = db.speaking_sessions.find(
        {"userId": user["_id"]},
        {"evaluation.overallScore": 1, "topic": 1, "createdAt": 1},
        sort=[("createdAt", -1)],
        limit=10
    )
    recent_raw = await score_cursor.to_list(length=10)
    session_scores = [
        {
            "score": s.get("evaluation", {}).get("overallScore", 0),
            "topic": s.get("topic", ""),
            "date": s.get("createdAt").isoformat() if s.get("createdAt") else "",
            "id": str(s["_id"])
        }
        for s in reversed(recent_raw)
    ]

    # Last 5 sessions for display
    recent_sessions = session_scores[-5:] if len(session_scores) >= 5 else session_scores

    # Top grammar mistakes
    mistake_pipeline = [
        {"$match": {"userId": user["_id"]}},
        {"$unwind": "$evaluation.grammarMistakes"},
        {"$group": {"_id": "$evaluation.grammarMistakes.mistake", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    mistakes_raw = await db.speaking_sessions.aggregate(mistake_pipeline).to_list(5)
    top_mistakes = [{"mistake": m["_id"], "count": m["count"]} for m in mistakes_raw if m["_id"]]

    return {
        **base,
        "_id": None,
        "sessionScores": session_scores,
        "recentSessions": recent_sessions,
        "topMistakes": top_mistakes,
    }


@router.get("/reading/paragraph")
async def get_reading_paragraph(topic: str, level: str = "beginner", user=Depends(get_current_user)):
    """GET /api/speaking/reading/paragraph?topic=...&level=beginner — Generate reading practice paragraph"""
    data = await generate_reading_paragraph(topic, level)
    return data


@router.post("/reading/evaluate")
async def evaluate_reading_session(data: ReadingEvalRequest, user=Depends(get_current_user)):
    """POST /api/speaking/reading/evaluate — Evaluate how well the user read the paragraph"""
    db = get_db()

    evaluation = await evaluate_reading(data.originalParagraph, data.spokenText, data.topic)

    # Save to MongoDB (same collection, marked as reading type)
    session = {
        "userId": user["_id"],
        "topic": data.topic,
        "type": "reading",
        "transcript": data.spokenText,
        "originalParagraph": data.originalParagraph,
        "evaluation": {
            "overallScore": evaluation.get("overallScore", 0),
            "fluencyScore": evaluation.get("fluencyScore", 0),
            "confidenceScore": evaluation.get("accuracyScore", 0),  # map accuracy → confidence slot
            "detailedFeedback": evaluation.get("detailedFeedback", ""),
            "strengths": evaluation.get("strengths", []),
            "improvements": evaluation.get("improvements", []),
            "grammarMistakes": [],
            "vocabularySuggestions": [],
        },
        "duration": data.duration,
        "wordCount": len(data.spokenText.split()),
        "createdAt": datetime.utcnow(),
    }
    result = await db.speaking_sessions.insert_one(session)

    return {"sessionId": str(result.inserted_id), "evaluation": evaluation}


class VoiceChatRequest(BaseModel):
    messages: list
    scenario: str = "Tech Job Interview"
    difficulty: str = "Intermediate"


@router.post("/chat")
async def voice_chat_turn(data: VoiceChatRequest, user=Depends(get_current_user)):
    """POST /api/speaking/chat — Real-time conversational coach turn"""
    from app.services.ai_service import chat_speaking_coach
    result = await chat_speaking_coach(data.messages, data.scenario, data.difficulty)
    return result

