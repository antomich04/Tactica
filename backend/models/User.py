from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="viewer")
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    preferences: Mapped["UserPreference"] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    email_verified: Mapped[bool] = mapped_column(default=False)

class UserPreference(Base):
    __tablename__ = "user_preferences"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    
    favorite_team: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    favorite_player: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    language: Mapped[str] = mapped_column(String(10), default="en")
    persona: Mapped[str] = mapped_column(String(20), default="casual")

    user: Mapped["User"] = relationship(back_populates="preferences")

class OTP(Base):
    __tablename__ = "otps"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    purpose: Mapped[str] = mapped_column(String(20))  # "verify_email" or "forgot_password"
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone.utc), nullable=False)