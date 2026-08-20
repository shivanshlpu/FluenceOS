from fastapi import APIRouter, HTTPException, status
from app.models.user import UserRegister, UserLogin
from app.services.auth_service import hash_password, verify_password, create_access_token, get_current_user
from app.database import get_db
from datetime import datetime
from fastapi import Depends

router = APIRouter()


@router.post("/register")
async def register(data: UserRegister):
    """POST /api/auth/register — Create new user"""
    db = get_db()

    # Check if user exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user_doc = {
        "name": data.name,
        "email": data.email,
        "password": hash_password(data.password),
        "avatar": None,
        "createdAt": datetime.utcnow(),
        "lastLogin": datetime.utcnow(),
        "settings": {
            "dailyGoalMinutes": 30,
            "focusSkill": "",
            "notificationsEnabled": True,
        }
    }
    result = await db.users.insert_one(user_doc)

    # Generate token
    token = create_access_token(str(result.inserted_id))

    return {
        "token": token,
        "user": {
            "id": str(result.inserted_id),
            "name": data.name,
            "email": data.email,
        }
    }


@router.post("/login")
async def login(data: UserLogin):
    """POST /api/auth/login — Authenticate user"""
    db = get_db()

    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Update last login
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"lastLogin": datetime.utcnow()}}
    )

    token = create_access_token(str(user["_id"]))

    return {
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
        }
    }


@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    """GET /api/auth/me — Get current user profile"""
    return {
        "id": user["_id"],
        "name": user["name"],
        "email": user["email"],
        "avatar": user.get("avatar"),
        "settings": user.get("settings", {}),
    }
