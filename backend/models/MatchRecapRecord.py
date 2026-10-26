from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from models.User import Base


class MatchRecapRecord(Base):
    __tablename__ = "match_recaps"

    match_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_sub: Mapped[str] = mapped_column(String(128), primary_key=True)
    summary: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    recap: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
