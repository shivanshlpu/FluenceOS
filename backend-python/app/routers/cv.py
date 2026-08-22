from fastapi import APIRouter, Depends
from app.services.auth_service import get_current_user
from app.services.ai_service import enhance_cv_bullet, calculate_ats_match
from app.database import get_db
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import json

router = APIRouter()


class EnhanceBulletRequest(BaseModel):
    bullet: str
    role: Optional[str] = "Software Engineer"
    targetJob: Optional[str] = "Tech Roles"


class ATSCheckRequest(BaseModel):
    cvText: str
    jobDescription: str


class SaveCVRequest(BaseModel):
    cvData: Dict[str, Any]
    title: Optional[str] = "My Resume"


# In-memory fallback dictionary for offline/local resilience
_SAVED_CVS: Dict[str, Dict[str, Any]] = {}


@router.post("/enhance-bullet")
async def enhance_bullet(data: EnhanceBulletRequest, user=Depends(get_current_user)):
    """POST /api/cv/enhance-bullet — AI STAR bullet point optimization (100% Free)"""
    result = await enhance_cv_bullet(data.bullet, data.role, data.targetJob)
    return result


@router.post("/ats-check")
async def ats_score_check(data: ATSCheckRequest, user=Depends(get_current_user)):
    """POST /api/cv/ats-check — ATS scanner and match calculator"""
    result = await calculate_ats_match(data.cvText, data.jobDescription)
    return result


@router.get("/my-cv")
async def get_my_cv(user=Depends(get_current_user)):
    """GET /api/cv/my-cv — Load user's saved CV"""
    user_id = user["id"]
    pool = get_db()
    if pool is not None:
        try:
            async with pool.acquire() as conn:
                cv = await conn.fetchrow(
                    "SELECT cv_data, title FROM user_resumes WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1",
                    user_id
                )
                if cv:
                    cv_data = cv["cv_data"]
                    if isinstance(cv_data, str):
                        cv_data = json.loads(cv_data)
                    return {"cv": cv_data, "title": cv.get("title", "My Resume")}
        except Exception as e:
            print(f"[CV] DB fetch fallback: {e}")

    # Check fallback store
    if user_id in _SAVED_CVS:
        return _SAVED_CVS[user_id]

    return {"cv": None, "title": "My Resume"}

@router.post("/save")
async def save_my_cv(data: SaveCVRequest, user=Depends(get_current_user)):
    """POST /api/cv/save — Save or update user's CV in DB and fallback cache"""
    user_id = user["id"]
    # Save in memory fallback
    _SAVED_CVS[user_id] = {"cv": data.cvData, "title": data.title}

    pool = get_db()
    if pool is not None:
        try:
            async with pool.acquire() as conn:
                cv_json = json.dumps(data.cvData)
                await conn.execute("DELETE FROM user_resumes WHERE user_id = $1", user_id)
                await conn.execute(
                    """
                    INSERT INTO user_resumes (user_id, cv_data, title, updated_at)
                    VALUES ($1, $2::jsonb, $3, now())
                    """,
                    user_id, cv_json, data.title
                )
            return {"success": True, "message": "CV saved successfully!"}
        except Exception as e:
            return {"success": True, "message": "Saved in session cache!", "db_warning": str(e)}

    return {"success": True, "message": "Saved locally!"}

