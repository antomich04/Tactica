import asyncio
from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from config.database_client import get_db_client
from models.MatchRecapRecord import MatchRecapRecord

_table_ready = False
_table_lock = asyncio.Lock()

async def _ensure_table() -> None:
    global _table_ready
    if _table_ready:
        return

    async with _table_lock:
        if _table_ready:
            return
        engine = get_db_client()
        async with engine.begin() as connection:
            await connection.run_sync(
                lambda sync_connection: MatchRecapRecord.__table__.create(
                    sync_connection, checkfirst=True
                )
            )
        _table_ready = True


async def save_match_recap_record(
    match_id: str,
    user_sub: str,
    summary: dict[str, Any],
    recap: dict[str, Any],
) -> None:
    await _ensure_table()
    engine = get_db_client()
    async with AsyncSession(engine) as session:
        async with session.begin():
            await session.merge(
                MatchRecapRecord(
                    match_id=match_id,
                    user_sub=user_sub,
                    summary=summary,
                    recap=recap,
                )
            )


async def get_match_recap_record(
    user_sub: str, match_id: str | None = None
) -> dict[str, Any] | None:
    await _ensure_table()
    engine = get_db_client()
    async with AsyncSession(engine) as session:
        if match_id:
            query = select(MatchRecapRecord).where(
                MatchRecapRecord.user_sub == user_sub,
                MatchRecapRecord.match_id == match_id,
            )
            record = (await session.execute(query.limit(1))).scalars().first()
            if record is None:
                query = select(MatchRecapRecord).where(
                    MatchRecapRecord.user_sub == "__public__",
                    MatchRecapRecord.match_id == match_id,
                )
                record = (await session.execute(query.limit(1))).scalars().first()
        else:
            query = (
                select(MatchRecapRecord)
                .where(MatchRecapRecord.user_sub.in_((user_sub, "__public__")))
                .order_by(MatchRecapRecord.created_at.desc())
            )
            record = (await session.execute(query.limit(1))).scalars().first()
        if record is None:
            return None
        return {
            "summary": record.summary,
            "recap": record.recap,
            "owner": record.user_sub,
        }
