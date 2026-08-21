from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, speaking, knowledge, dashboard, tracker, cv
from app.database import connect_db, disconnect_db, get_db
from datetime import datetime

app = FastAPI(
    title="Personal AI Growth OS",
    version="1.0.0",
    description="AI-powered personal development platform"
)

# CORS — allow all origins (Vercel, localhost, mobile PWA)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup / Shutdown DB
app.add_event_handler("startup", connect_db)
app.add_event_handler("shutdown", disconnect_db)

# Register routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(speaking.router, prefix="/api/speaking", tags=["Speaking"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["Knowledge"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(tracker.router, prefix="/api/tracker", tags=["Tracker"])
app.include_router(cv.router, prefix="/api/cv", tags=["CV Maker"])


@app.get("/")
async def root():
    return {"message": "🧠 AI Growth OS API is running", "version": "1.0.0"}


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint for UptimeRobot / uptime monitors"""
    pool = get_db()
    db_status = "disconnected"
    if pool is not None:
        try:
            async with pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            db_status = "connected"
        except Exception:
            db_status = "error"

    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "service": "FluenceOS Backend API",
        "database": db_status,
        "version": "1.0.0"
    }
