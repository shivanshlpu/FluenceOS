import asyncpg
from app.config import DATABASE_URL

# Global pool reference
pool = None

async def connect_db():
    global pool
    try:
        # Check if URL exists and handles basic parse, but allow asyncpg to do the rest.
        if not DATABASE_URL:
            print("⚠️ DATABASE_URL is not set in .env. Postgres will fail to connect.")
            return

        print(f"🔄 Connecting to PostgreSQL...")
        
        pool = await asyncpg.create_pool(
            dsn=DATABASE_URL,
            min_size=1,
            max_size=10,
            command_timeout=60,
        )
        print("✅ Connected to PostgreSQL")
        
    except Exception as e:
        print(f"⚠️ PostgreSQL connection failed: {e}")
        print("⚠️ Server will start but database operations will fail.")
        
async def disconnect_db():
    global pool
    if pool:
        await pool.close()
        print("🔌 Disconnected from PostgreSQL")

def get_db():
    """
    Returns the asyncpg connection pool.
    Routers should use: `async with pool.acquire() as conn:`
    """
    return pool
