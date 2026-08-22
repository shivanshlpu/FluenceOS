"""
NEWS SERVICE — DataCube AI News API Integration + RSS Fallback & In-Memory/DB Cache
Free Public AI News API: https://www.datacubeai.space/en/tools/ai-news-api#endpoints
Base URL: https://api-production-3ee5.up.railway.app
"""

import asyncio
import httpx
import feedparser
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from app.database import get_db

DATACUBE_BASE_URL = "https://api-production-3ee5.up.railway.app"

# In-memory cache for ultra-fast responses
_MEM_CACHE: Dict[str, Dict[str, Any]] = {}
_MEM_CACHE_TTL = timedelta(minutes=15)

RSS_FEEDS = {
    "AI": [
        "https://techcrunch.com/category/artificial-intelligence/feed/",
        "https://news.mit.edu/rss/topic/artificial-intelligence2",
    ],
    "Startup": [
        "https://techcrunch.com/category/startups/feed/",
    ],
    "Tech": [
        "https://feeds.arstechnica.com/arstechnica/technology-lab",
    ],
}


import re
import html

def clean_html_to_paragraphs(raw_text: str) -> str:
    """Cleans raw HTML into well-structured paragraphs with clear line breaks."""
    if not raw_text:
        return ""
    text = html.unescape(raw_text)
    # Replace block tags with paragraph breaks
    text = re.sub(r'<(?:p|div|br|li|h[1-6]|tr|blockquote)[^>]*>', '\n\n', text, flags=re.IGNORECASE)
    # Remove all remaining HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    # Clean whitespace per paragraph
    raw_paras = [re.sub(r'[ \t]+', ' ', p).strip() for p in text.split('\n\n') if p.strip()]
    if not raw_paras:
        return text.strip()
    return '\n\n'.join(raw_paras)


def extract_paragraphs(text: str) -> List[str]:
    """Splits cleaned text into separate readable paragraphs."""
    if not text:
        return []
    paras = [p.strip() for p in text.split('\n\n') if len(p.strip()) > 0]
    return paras if paras else [text.strip()]


def extract_tags(text: str) -> list:
    tag_keywords = {
        "GPT": "OpenAI", "Claude": "Anthropic", "Gemini": "Google",
        "DeepSeek": "DeepSeek", "Llama": "Meta", "startup": "Startup",
        "funding": "Investment", "agent": "AI Agents", "Python": "Python",
        "React": "React", "machine learning": "ML", "robot": "Robotics",
        "Nvidia": "NVIDIA", "OpenAI": "OpenAI", "Anthropic": "Anthropic",
    }
    return list({v for k, v in tag_keywords.items() if k.lower() in text.lower()})[:5]


def _get_from_mem_cache(key: str) -> Optional[Any]:
    entry = _MEM_CACHE.get(key)
    if entry and datetime.utcnow() - entry["timestamp"] < _MEM_CACHE_TTL:
        return entry["data"]
    return None



def _set_mem_cache(key: str, data: Any):
    _MEM_CACHE[key] = {
        "data": data,
        "timestamp": datetime.utcnow()
    }


async def get_available_periods() -> Dict[str, Any]:
    """Fetch available weeks and nested days from DataCube AI API"""
    cache_key = "datacube_periods"
    cached = _get_from_mem_cache(cache_key)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.get(f"{DATACUBE_BASE_URL}/api/weeks")
            if res.status_code == 200:
                data = res.json()
                _set_mem_cache(cache_key, data)
                return data
    except Exception as e:
        print(f"⚠️ Failed to fetch DataCube periods: {e}")

    # Fallback default structure
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    return {"weeks": [{"id": f"{datetime.utcnow().year}-kw{datetime.utcnow().isocalendar()[1]}", "days": [{"id": today_str, "label": today_str}]}]}


async def get_latest_active_period() -> str:
    """Find the most recent period day with active news"""
    periods_data = await get_available_periods()
    weeks = periods_data.get("weeks", [])

    for week in weeks:
        days = week.get("days", [])
        for day in reversed(days):
            day_id = day.get("id")
            if day_id:
                return day_id

        week_id = week.get("id")
        if week_id:
            return week_id

    return datetime.utcnow().strftime("%Y-%m-%d")


async def fetch_datacube_news(category_type: str = "tech", period_id: Optional[str] = None, lang: str = "en") -> List[Dict[str, Any]]:
    """
    Fetch news from DataCube API by category:
    category_type: 'tech' | 'investment' | 'tips' | 'videos' | 'trends'
    """
    if not period_id:
        period_id = await get_latest_active_period()

    cache_key = f"datacube_{category_type}_{period_id}_{lang}"
    cached = _get_from_mem_cache(cache_key)
    if cached:
        return cached

    endpoint_map = {
        "tech": f"{DATACUBE_BASE_URL}/api/tech/{period_id}",
        "investment": f"{DATACUBE_BASE_URL}/api/investment/{period_id}",
        "tips": f"{DATACUBE_BASE_URL}/api/tips/{period_id}",
        "videos": f"{DATACUBE_BASE_URL}/api/videos/{period_id}",
        "trends": f"{DATACUBE_BASE_URL}/api/trends/{period_id}",
    }

    url = endpoint_map.get(category_type, endpoint_map["tech"])

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.get(url)
            if res.status_code == 200:
                data = res.json()

                articles = []
                if isinstance(data, dict):
                    # Multi-language dictionary {"en": [...], "de": [...]}
                    articles = data.get(lang) or data.get("en") or []
                    if not articles and data:
                        # Grab first available language if en is empty
                        first_val = next(iter(data.values()), [])
                        if isinstance(first_val, list):
                            articles = first_val
                elif isinstance(data, list):
                    articles = data

                # Format articles cleanly with proper paragraph parsing
                formatted = []
                for item in articles:
                    raw_summary = item.get("content") or item.get("summary") or ""
                    cleaned_summary = clean_html_to_paragraphs(raw_summary)
                    paras = extract_paragraphs(cleaned_summary)
                    formatted.append({
                        "id": item.get("id"),
                        "title": item.get("author", {}).get("name") if item.get("author") else (item.get("title") or "AI Update"),
                        "summary": cleaned_summary,
                        "paragraphs": paras,
                        "category": item.get("category") or category_type.capitalize(),
                        "tags": item.get("tags") or [],
                        "impact": item.get("impact", "medium"),
                        "source": item.get("source") or "DataCube AI",
                        "sourceUrl": item.get("sourceUrl") or item.get("url") or "https://www.datacubeai.space",
                        "publishedAt": item.get("timestamp") or period_id,
                        "isVideo": item.get("isVideo", False),
                        "videoId": item.get("videoId"),
                        "videoThumbnailUrl": item.get("videoThumbnailUrl"),
                        "author": item.get("author"),
                    })

                if formatted:
                    _set_mem_cache(cache_key, formatted)
                    return formatted

    except Exception as e:
        print(f"⚠️ DataCube API fetch failed for {url}: {e}")

    return []


async def fetch_rss_feed(url: str, category: str) -> list:
    """Fetch and parse a single RSS feed as fallback with full paragraph extraction"""
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(url, follow_redirects=True)
            feed = feedparser.parse(response.text)

            articles = []
            for entry in feed.entries[:8]:
                # Grab content / summary / description
                raw_content = ""
                if "content" in entry and entry.content:
                    raw_content = entry.content[0].get("value", "")
                if not raw_content:
                    raw_content = entry.get("summary", "") or entry.get("description", "")

                cleaned_summary = clean_html_to_paragraphs(raw_content)
                paras = extract_paragraphs(cleaned_summary)

                articles.append({
                    "id": entry.get("id", entry.get("link", "")),
                    "title": entry.get("title", "AI News Update"),
                    "summary": cleaned_summary,
                    "paragraphs": paras,
                    "url": entry.get("link", ""),
                    "sourceUrl": entry.get("link", ""),
                    "source": feed.feed.get("title", "Tech Feed"),
                    "publishedAt": entry.get("published", str(datetime.utcnow().strftime("%Y-%m-%d"))),
                    "category": category,
                    "impact": "medium",
                    "tags": extract_tags(entry.get("title", "") + " " + cleaned_summary),
                    "isVideo": False,
                })
            return articles
    except Exception as e:
        print(f"⚠️ RSS Feed failed {url}: {e}")
        return []




async def get_all_news(category_type: str = "tech", period_id: Optional[str] = None, lang: str = "en") -> List[Dict[str, Any]]:
    """
    Primary: Fetch from DataCube AI News API by period/date.
    Smart Fallbacks:
      1. If specific date is empty, try the corresponding week (e.g., 2026-kw34).
      2. If still empty, try latest active period.
      3. Fallback to live RSS feeds.
    """
    if not period_id:
        period_id = await get_latest_active_period()

    # 1. Try exact period / date
    datacube_articles = await fetch_datacube_news(category_type=category_type, period_id=period_id, lang=lang)
    if datacube_articles:
        return datacube_articles

    # 2. If it's a date YYYY-MM-DD, try the week period (e.g. 2026-kw34)
    if period_id and len(period_id) == 10 and "-" in period_id:
        try:
            dt = datetime.strptime(period_id, "%Y-%m-%d")
            week_id = f"{dt.year}-kw{dt.isocalendar()[1]}"
            week_articles = await fetch_datacube_news(category_type=category_type, period_id=week_id, lang=lang)
            if week_articles:
                return week_articles
        except Exception:
            pass

    # 3. If specific category requested and empty, try tech
    if category_type != "tech":
        fallback_tech = await fetch_datacube_news(category_type="tech", period_id=period_id, lang=lang)
        if fallback_tech:
            return fallback_tech

    # 4. Try latest active period
    latest_id = await get_latest_active_period()
    if latest_id != period_id:
        latest_articles = await fetch_datacube_news(category_type=category_type, period_id=latest_id, lang=lang)
        if latest_articles:
            return latest_articles

    # 5. Fallback to parallel RSS Feeds
    tasks = []
    for cat, urls in RSS_FEEDS.items():
        for url in urls:
            tasks.append(fetch_rss_feed(url, cat))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_articles = []
    for res in results:
        if isinstance(res, list):
            all_articles.extend(res)

    all_articles.sort(key=lambda x: str(x.get("publishedAt", "")), reverse=True)
    return all_articles[:30]
