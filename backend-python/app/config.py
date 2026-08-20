import os
from dotenv import load_dotenv

load_dotenv()

# Database
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = "aios"

# JWT
JWT_SECRET = os.getenv("JWT_SECRET", "default_secret_change_this_in_production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))

# AI APIs
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# News APIs
GUARDIAN_API_KEY = os.getenv("GUARDIAN_API_KEY", "")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
