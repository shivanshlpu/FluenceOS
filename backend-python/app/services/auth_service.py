from datetime import datetime, timedelta
import jwt
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES
from app.database import get_db

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
security = HTTPBearer()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    pool = get_db()
    if not pool:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM profiles WHERE id = $1", user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Convert record to dict
        user_dict = dict(user)
        user_dict["_id"] = str(user_dict["id"])
        
        # Parse JSONB settings if they exist
        import json
        if user_dict.get("settings"):
            if isinstance(user_dict["settings"], str):
                user_dict["settings"] = json.loads(user_dict["settings"])
        else:
            user_dict["settings"] = {}
            
        return user_dict
