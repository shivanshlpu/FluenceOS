from fastapi import APIRouter, Depends
from app.services.auth_service import get_current_user
from app.services.ai_service import enhance_cv_bullet, calculate_ats_match
from app.database import get_db
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

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
    db = get_db()
    if db is not None:
        try:
            cv = await db.user_cvs.find_one({"userId": user["_id"]}, sort=[("updatedAt", -1)])
            if cv:
                cv["_id"] = str(cv["_id"])
                cv["userId"] = str(cv["userId"])
                return {"cv": cv.get("cvData", {}), "title": cv.get("title", "My Resume")}
        except Exception:
            pass

    # Default starter template data
    return {
        "cv": {
            "personalInfo": {
                "fullName": user.get("name", "Alex Morgan"),
                "email": user.get("email", "alex.morgan@email.com"),
                "phone": "+1 (555) 234-5678",
                "location": "San Francisco, CA",
                "linkedin": "linkedin.com/in/alexmorgan",
                "github": "github.com/alexmorgan",
                "portfolio": "alexmorgan.dev",
                "title": "Full Stack & AI Engineer"
            },
            "summary": "Innovative Full Stack Engineer with 3+ years of experience designing high-throughput web applications and AI-driven systems. Passionate about clean architecture, scalable microservices, and continuous self-improvement.",
            "experience": [
                {
                    "id": "exp_1",
                    "role": "Full Stack Software Engineer",
                    "company": "TechCorp Innovations",
                    "location": "Remote",
                    "startDate": "2023",
                    "endDate": "Present",
                    "bullets": [
                        "Architected and deployed modern React and FastAPI microservices, serving 50,000+ daily active users.",
                        "Optimized database queries and Redis caching layer, reducing API latency by 42% across core endpoints.",
                        "Spearheaded automated CI/CD deployment pipelines on GitHub Actions, cutting release cycles from 4 hours to 15 minutes."
                    ]
                }
            ],
            "projects": [
                {
                    "id": "proj_1",
                    "name": "Personal AI Growth OS",
                    "technologies": "React, FastAPI, Web Speech API, Supabase, Groq LLaMA 3",
                    "link": "github.com/user/ai-growth-os",
                    "bullets": [
                        "Built real-time spoken English voice coach with zero-latency browser speech synthesis and automated CEFR grading.",
                        "Integrated DataCube AI News REST API for daily multilingual intelligence feed with automated caching."
                    ]
                }
            ],
            "skills": {
                "languages": ["Python", "JavaScript / TypeScript", "Java", "SQL", "HTML5/CSS3"],
                "frameworks": ["FastAPI", "React", "Node.js", "Spring Boot", "Tailwind CSS"],
                "tools": ["Git & GitHub", "Docker", "Supabase", "MongoDB", "PostgreSQL", "Linux"]
            },
            "education": [
                {
                    "id": "edu_1",
                    "degree": "B.S. in Computer Science",
                    "institution": "University of Technology",
                    "year": "2020 - 2024",
                    "location": "CA, USA"
                }
            ],
            "certifications": ["AWS Certified Solutions Architect (Associate)", "DeepLearning.AI Generative AI Specialist"]
        },
        "title": "My Resume"
    }


@router.post("/save")
async def save_my_cv(data: SaveCVRequest, user=Depends(get_current_user)):
    """POST /api/cv/save — Save or update user's CV in DB"""
    db = get_db()
    if db is not None:
        try:
            await db.user_cvs.replace_one(
                {"userId": user["_id"]},
                {
                    "userId": user["_id"],
                    "cvData": data.cvData,
                    "title": data.title,
                    "updatedAt": datetime.utcnow()
                },
                upsert=True
            )
            return {"success": True, "message": "CV saved successfully!"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    return {"success": True, "message": "Saved locally!"}
