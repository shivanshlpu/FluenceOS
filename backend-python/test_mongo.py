import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGODB_URL

async def test_conn():
    try:
        print(f"Testing URL: {MONGODB_URL.replace(MONGODB_URL.split('@')[0], 'hidden')}")
        client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
        await client.admin.command('ping')
        print("✅ SUCCESS: Connected to MongoDB Cloud successfully!")
    except Exception as e:
        print(f"❌ ERROR: Failed to connect -> {e}")

if __name__ == "__main__":
    asyncio.run(test_conn())
