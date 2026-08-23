import asyncpg
from app.config import DATABASE_URL
import ssl

# Global pool reference
pool = None

async def connect_db():
    global pool
    try:
        if not DATABASE_URL:
            print("[INFO] DATABASE_URL is not set in .env. Postgres will fail to connect.")
            return

        # Clean any accidental quotes
        clean_url = DATABASE_URL.strip().strip('"').strip("'")
        host_info = clean_url.split('@')[-1] if '@' in clean_url else 'local'

        print(f"[INFO] Connecting to PostgreSQL at {host_info}...")
        
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        # Disable prepared statement caching (recommended for Supabase Supavisor pooler)
        pool = await asyncpg.create_pool(
            dsn=clean_url,
            min_size=1,
            max_size=10,
            command_timeout=30,
            statement_cache_size=0,
            ssl=ctx,
        )
        print("[INFO] Connected to PostgreSQL successfully!")
        
    except Exception as e:
        print(f"[WARNING] PostgreSQL connection failed: {e}")
        print("[WARNING] Server will continue running with memory fallbacks.")
        
async def disconnect_db():
    global pool
    if pool:
        try:
            await pool.close()
            print("[INFO] Disconnected from PostgreSQL")
        except Exception:
            pass

def get_db():
    """
    Returns the asyncpg connection pool.
    Routers should use: `async with pool.acquire() as conn:`
    """
    return pool
