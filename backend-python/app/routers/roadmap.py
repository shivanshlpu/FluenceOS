from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.auth_service import get_optional_user
from app.services.roadmap_service import generate_complete_roadmap, generate_topic_guide

router = APIRouter()


class GenerateRoadmapRequest(BaseModel):
    skill: str
    level: Optional[str] = "Beginner"


class TopicGuideRequest(BaseModel):
    skill: str
    topicName: str


@router.post("/generate")
async def generate_roadmap(data: GenerateRoadmapRequest, user=Depends(get_optional_user)):
    """
    POST /api/roadmap/generate
    Generates a full 5-phase master roadmap with setup guide, topic breakdowns, runnable code, and projects.
    """
    return await generate_complete_roadmap(data.skill, data.level or "Beginner")


@router.post("/topic-guide")
async def get_topic_guide(data: TopicGuideRequest, user=Depends(get_optional_user)):
    """
    POST /api/roadmap/topic-guide
    Generates an on-demand deep-dive tutorial with runnable code snippet, pitfalls, and step-by-step instructions.
    """
    return await generate_topic_guide(data.skill, data.topicName)


@router.get("/presets")
async def get_roadmap_presets():
    """
    GET /api/roadmap/presets
    Returns curated 1-click popular technologies.
    """
    presets = [
        {"skill": "Python", "icon": "🐍", "category": "Backend & AI", "desc": "FastAPI, Data Structures, & AI Pipelines", "level": "Beginner"},
        {"skill": "React & Next.js", "icon": "⚛️", "category": "Frontend", "desc": "Hooks, Server Components & Full-Stack", "level": "Beginner"},
        {"skill": "Machine Learning & AI", "icon": "🤖", "category": "AI Engineering", "desc": "Neural Networks, PyTorch & LLMs", "level": "Intermediate"},
        {"skill": "Rust", "icon": "🦀", "category": "Systems", "desc": "Memory Safety, Concurrency & High Performance", "level": "Beginner"},
        {"skill": "Go (Golang)", "icon": "🚀", "category": "Backend", "desc": "Goroutines, Microservices & High Concurrency", "level": "Beginner"},
        {"skill": "Docker & Kubernetes", "icon": "🐳", "category": "DevOps", "desc": "Containers, Compose & Orchestration", "level": "Intermediate"},
        {"skill": "Java Spring Boot", "icon": "☕", "category": "Enterprise", "desc": "Enterprise REST APIs, Security & JPA", "level": "Beginner"},
        {"skill": "System Design & DSA", "icon": "🏗️", "category": "Architecture", "desc": "Scalability, Caching & Interview Mastery", "level": "Advanced"},
        {"skill": "TypeScript", "icon": "💙", "category": "Full-Stack", "desc": "Type Safety, Generics & Node.js", "level": "Beginner"},
        {"skill": "SQL & PostgreSQL", "icon": "🐘", "category": "Database", "desc": "Queries, Indexing & Optimization", "level": "Beginner"},
    ]
    return {"presets": presets}
