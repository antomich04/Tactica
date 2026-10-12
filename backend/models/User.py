from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey,Boolean
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="viewer")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    preferences: Mapped["UserPreference"] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )

class UserPreference(Base):
    __tablename__ = "user_preferences"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    
    # Tactica Personalization Fields
    favorite_team: Mapped[Optional[str]] = mapped_column(String(50))
    language: Mapped[str] = mapped_column(String(10), default="en")
    persona: Mapped[str] = mapped_column(String(20), default="casual")

    user: Mapped["User"] = relationship(back_populates="preferences")