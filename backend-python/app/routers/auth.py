from fastapi import APIRouter, HTTPException, status
from app.models.user import UserRegister, UserLogin
from app.services.auth_service import hash_password, verify_password, create_access_token, get_current_user
from app.database import get_db
from fastapi import Depends
import json

router = APIRouter()

@router.post("/register")
async def register(data: UserRegister):
    """POST /api/auth/register — Create new user"""
    pool = get_db()
    if not pool:
        raise HTTPException(status_code=500, detail="Database not connected")

    async with pool.acquire() as conn:
        # Check if user exists
        existing = await conn.fetchrow("SELECT id FROM profiles WHERE email = $1", data.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Create user
        hashed_pw = hash_password(data.password)
        settings = json.dumps({
            "dailyGoalMinutes": 30,
            "focusSkill": "",
            "notificationsEnabled": True,
        })
        
        row = await conn.fetchrow(
            """
            INSERT INTO profiles (email, full_name, password_hash, settings)
            VALUES ($1, $2, $3, $4::jsonb)
            RETURNING id, email, full_name
            """,
            data.email, data.name, hashed_pw, settings
        )

        # Generate token
        token = create_access_token(str(row["id"]))

        return {
            "token": token,
            "user": {
                "id": str(row["id"]),
                "name": row["full_name"],
                "email": row["email"],
            }
        }


@router.post("/login")
async def login(data: UserLogin):
    """POST /api/auth/login — Authenticate user"""
    pool = get_db()
    if not pool:
        raise HTTPException(status_code=500, detail="Database not connected")

    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT id, email, full_name, password_hash FROM profiles WHERE email = $1", data.email)
        
        if not user or not verify_password(data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Update last login
        await conn.execute("UPDATE profiles SET last_login = now() WHERE id = $1", user["id"])

        token = create_access_token(str(user["id"]))

        return {
            "token": token,
            "user": {
                "id": str(user["id"]),
                "name": user["full_name"],
                "email": user["email"],
            }
        }


@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    """GET /api/auth/me — Get current user profile"""
    return {
        "id": user["id"],
        "name": user.get("full_name"),
        "email": user["email"],
        "avatar": user.get("avatar_url"),
        "settings": user.get("settings", {}),
    }
