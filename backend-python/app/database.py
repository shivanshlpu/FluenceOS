from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGODB_URL, DB_NAME

client = None
db = None


async def connect_db():
    global client, db
    try:
        client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
        db = client[DB_NAME]

        # Test connection by pinging
        await client.admin.command('ping')

        # Create indexes for performance
        await db.users.create_index("email", unique=True)
        await db.speaking_sessions.create_index("userId")
        await db.speaking_sessions.create_index("createdAt")
        await db.skill_progress.create_index([("userId", 1), ("skillName", 1)])
        print(f"✅ Connected to MongoDB: {DB_NAME}")
    except Exception as e:
        print(f"⚠️ MongoDB connection failed: {e}")
        print("⚠️ Server will start but database operations will fail.")
        print("⚠️ Please check your MONGODB_URL in .env file.")
        # Still set db to allow server to start (endpoints will fail gracefully)
        if client:
            db = client[DB_NAME]


async def disconnect_db():
    global client
    if client:
        client.close()
        print("🔌 Disconnected from MongoDB")


def get_db():
    return db
