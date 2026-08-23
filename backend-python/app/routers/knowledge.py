from fastapi import APIRouter, Depends, Query
from app.services.news_service import get_all_news, get_available_periods
from app.services.ai_service import expand_news_article
from app.services.roadmap_service import generate_complete_roadmap
from app.services.auth_service import get_current_user
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()


class RoadmapRequest(BaseModel):
    skill: str
    level: str = "Beginner"


class ExpandNewsRequest(BaseModel):
    title: str
    summary: str
    source: Optional[str] = ""
    category: Optional[str] = "AI Tech"


@router.get("/periods")
async def get_periods(user=Depends(get_current_user)):
    """GET /api/knowledge/periods — Available weeks & days from DataCube AI API"""
    periods = await get_available_periods()
    return periods


@router.get("/news")
async def get_news(
    category: Optional[str] = None,
    type: Optional[str] = "tech",
    period: Optional[str] = None,
    lang: Optional[str] = "en",
    user=Depends(get_current_user)
):
    """
    GET /api/knowledge/news?type=tech&period=2026-08-18&lang=en
    Types supported: tech, investment, tips, videos, trends
    """
    articles = await get_all_news(category_type=type or "tech", period_id=period, lang=lang or "en")

    if category and category != "All":
        articles = [a for a in articles if a.get("category", "").lower() == category.lower() or category.lower() in [t.lower() for t in a.get("tags", [])]]

    return {"articles": articles, "total": len(articles), "period": period, "type": type}


@router.post("/news/expand")
async def expand_news(data: ExpandNewsRequest, user=Depends(get_current_user)):
    """
    POST /api/knowledge/news/expand
    Expands a short news brief into a full-length, structured multi-paragraph deep-dive report.
    """
    expanded = await expand_news_article(
        title=data.title,
        summary=data.summary,
        source=data.source or "",
        category=data.category or "AI Tech"
    )
    return expanded


@router.get("/trends")
async def get_trends(period: Optional[str] = None, user=Depends(get_current_user)):
    """GET /api/knowledge/trends — Trending topics"""
    articles = await get_all_news(category_type="tech", period_id=period)

    # Extract trending tags
    tag_counts = {}
    for article in articles:
        for tag in article.get("tags", []):
            tag_counts[tag] = tag_counts.get(tag, 0) + 1

    trends = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:12]
    return {"trends": [{"tag": t[0], "count": t[1]} for t in trends]}


@router.post("/roadmap/generate")
async def generate_roadmap(data: RoadmapRequest, user=Depends(get_current_user)):
    """POST /api/knowledge/roadmap/generate — AI-generated learning roadmap"""
    roadmap = await generate_complete_roadmap(data.skill, data.level or "Beginner")
    return roadmap


