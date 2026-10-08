from __future__ import annotations

import os
import secrets
import warnings
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

MIN_SECRET_LENGTH = 32  # 256 bits: the minimum RFC 7518 asks for with HS256
DEV_CORS_ORIGINS = "http://localhost:5173,http://localhost:4173"


@dataclass(frozen=True)
class AuthSettings:
    env: str  # "dev" or "prod"
    secret: str  # signs every JWT
    issuer: str
    audience: str
    access_ttl: int  # seconds an access token lives (default 300 = 5 minutes)
    refresh_ttl: int  # seconds a whole login session may last
    ws_ticket_ttl: int  # seconds a WebSocket ticket lives
    cookie_name: str
    cookie_secure: bool
    cookie_samesite: str
    cors_origins: tuple[str, ...]
    db_path: Path


def _int(name: str, default: int, low: int, high: int) -> int:
    value = int(os.getenv(name, default))
    if not low <= value <= high:
        raise RuntimeError(f"{name} must be between {low} and {high}, got {value}")
    return value


@lru_cache
def get_settings() -> AuthSettings:
    env = os.getenv("TACTICA_ENV", "dev").lower()
    if env not in {"dev", "prod"}:
        raise RuntimeError("TACTICA_ENV must be 'dev' or 'prod'")

    secret = os.getenv("JWT_SECRET", "")
    if not secret:
        if env == "prod":
            raise RuntimeError(
                "JWT_SECRET is required when TACTICA_ENV=prod. "
                'Generate one: python -c "import secrets; print(secrets.token_urlsafe(64))"'
            )
        secret = secrets.token_urlsafe(64)
        warnings.warn("JWT_SECRET is not set: using a random secret for this run only. Everyone is logged out on restart.")
    if len(secret) < MIN_SECRET_LENGTH:
        raise RuntimeError(f"JWT_SECRET must be at least {MIN_SECRET_LENGTH} characters")

    secure_default = "true" if env == "prod" else "false"
    cookie_secure = os.getenv("COOKIE_SECURE", secure_default).lower() == "true"
    samesite = os.getenv("COOKIE_SAMESITE", "lax").lower()
    if samesite not in {"lax", "strict", "none"}:
        raise RuntimeError("COOKIE_SAMESITE must be lax, strict or none")
    if samesite == "none" and not cookie_secure:
        raise RuntimeError("COOKIE_SAMESITE=none requires COOKIE_SECURE=true (browsers reject it otherwise)")

    origins_raw = os.getenv("CORS_ORIGINS", DEV_CORS_ORIGINS if env == "dev" else "")
    origins = tuple(o.strip().rstrip("/") for o in origins_raw.split(",") if o.strip())
    if env == "prod" and not origins:
        raise RuntimeError("CORS_ORIGINS is required when TACTICA_ENV=prod (comma-separated frontend origins)")
    if "*" in origins:
        raise RuntimeError("CORS_ORIGINS cannot contain '*': cookies require explicit origins")

    return AuthSettings(
        env=env,
        secret=secret,
        issuer="tactica-api",
        audience="tactica-app",
        access_ttl=_int("ACCESS_TOKEN_TTL_SECONDS", 300, 10, 900),
        refresh_ttl=_int("REFRESH_TOKEN_TTL_SECONDS", 7 * 24 * 3600, 60, 30 * 24 * 3600),
        ws_ticket_ttl=_int("WS_TICKET_TTL_SECONDS", 30, 5, 120),
        cookie_name="tactica_refresh",
        cookie_secure=cookie_secure,
        cookie_samesite=samesite,
        cors_origins=origins,
        db_path=Path(os.getenv("AUTH_DB_PATH", BACKEND_DIR / "data" / "auth.db")),
    )
