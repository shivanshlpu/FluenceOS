import asyncpg
from app.config import DATABASE_URL

# Global pool reference
pool = None

async def connect_db():
    global pool
    try:
        if not DATABASE_URL:
            print("⚠️ DATABASE_URL is not set in .env. Postgres will fail to connect.")
            return

        # Clean any accidental quotes
        clean_url = DATABASE_URL.strip().strip('"').strip("'")

        print(f"🔄 Connecting to PostgreSQL at {clean_url.split('@')[-1]}...")
        
        # Disable prepared statement caching (recommended for Supabase Supavisor pooler)
        pool = await asyncpg.create_pool(
            dsn=clean_url,
            min_size=1,
            max_size=10,
            command_timeout=60,
            statement_cache_size=0,
            ssl="require",
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
