from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from dotenv import load_dotenv
import os

_db_client: AsyncEngine | None = None

def get_db_client() -> AsyncEngine:
    global _db_client

    if _db_client is None:
        load_dotenv()
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            raise RuntimeError("DATABASE_URL is not configured.")

        if db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

        _db_client = create_async_engine(
            db_url,
            connect_args={"statement_cache_size": 0}
        )

    return _db_client