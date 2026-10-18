import jwt
import bcrypt
import logging
import os
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Callable
from fastapi import HTTPException, WebSocket, WebSocketException, status, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select, delete, or_
from sqlalchemy.orm import selectinload
from config.database_client import get_db_client
import uuid
from config.auth_settings import auth_settings
from config.db_retry_mechanism import with_db_retry
from models.User import User, UserPreference
from models.Session import Session
from models.User import OTP

logger = logging.getLogger(__name__)

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False, # To be changed to True when in Production mode
        samesite="lax",
        max_age=auth_settings.access_ttl
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False, # To be changed to True when in Production mode
        samesite="lax",
        max_age=auth_settings.refresh_ttl
    )

# Helper functions
def _hash_password(password: str) -> str:
    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    return hashed_bytes.decode('utf-8')

def _lazy_hash(password: str) -> Callable[[], str]:
    """Returns a callable that hashes on first call and reuses the result afterwards."""
    cached: list[str] = []

    def get() -> str:
        if not cached:
            cached.append(_hash_password(password))
        return cached[0]

    return get

def _verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )

def _create_token(user: User, token_type: str, ttl_seconds: int) -> str:
    payload = {
        "jti": str(uuid.uuid4()),  # This guarantees 100% uniqueness
        "sub": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "type": token_type,
        "team": user.preferences.favorite_team if user.preferences else None,
        "lang": user.preferences.language if user.preferences else "en",
        "persona": user.preferences.persona if user.preferences else "casual",
        "exp": datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
    }
    return jwt.encode(payload, auth_settings.jwt_secret, algorithm="HS256")

def _session_response(user: User, access_token: str, message: str) -> dict:
    return {
        "status": "success",
        "message": message,
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": auth_settings.access_ttl,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "email_verified": bool(user.email_verified),
        }
    }

# Register logic
@with_db_retry
async def _register_user_db(data: dict, password_hash: Callable[[], str]) -> tuple[str, str, dict]:
    """DB work only. Returns (access_token, refresh_token, session_data) once the commit succeeded."""
    engine = get_db_client()

    async with AsyncSession(engine) as db_session:
        
        username_query = select(User).where(User.username == data["username"])
        if (await db_session.execute(username_query)).scalars().first():
            raise HTTPException(status_code=400, detail="Username already exists")

        email_query = select(User).where(User.email == data["email"])
        if (await db_session.execute(email_query)).scalars().first():
            raise HTTPException(status_code=400, detail="Email already exists")

        new_user = User(
            username=data["username"],
            email=data["email"],
            password_hash=password_hash()
        )
        
        prefs_data = data.get("preferences") or {}
        new_user.preferences = UserPreference(
            favorite_team=prefs_data.get("favorite_team"),
            language=prefs_data.get("language", "en"),
            persona=prefs_data.get("persona", "casual")
        )

        db_session.add(new_user)
        
        await db_session.flush()

        access_token = _create_token(new_user, "access", auth_settings.access_ttl)
        refresh_token = _create_token(new_user, "refresh", auth_settings.refresh_ttl)
        session_token = secrets.token_urlsafe(64)
        
        new_session = Session(
            user_id=new_user.id,
            session_token=session_token,
            refresh_token=refresh_token,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=auth_settings.refresh_ttl)
        )
        db_session.add(new_session)
        session_data = _session_response(new_user, access_token, "User registered and logged in")
        await db_session.commit()
        return access_token, refresh_token, session_data

async def register_user(data: dict) -> tuple[str, str, dict]:
    return await _register_user_db(data, _lazy_hash(data["password"]))

# Login logic
@with_db_retry
async def _authenticate_user_db(
    identifier: str, password: str, existing_refresh_token: str | None = None
) -> tuple[str, str, dict]:
    """DB work only. Returns (access_token, refresh_token, session_data) once the commit succeeded."""
    engine = get_db_client()
    now = datetime.now(timezone.utc)

    async with AsyncSession(engine) as db_session:
        query = select(User).options(selectinload(User.preferences)).where(
            or_(
                User.username == identifier,
                User.email == identifier
            )
        )
        result = await db_session.execute(query)
        user = result.scalars().first()

        if not user or not _verify_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Cleans up expired sessions for this user, plus the current device's old session
        # if they are logging in again on the same browser, preserving other devices.
        cleanup_condition = Session.expires_at <= now
        if existing_refresh_token:
            cleanup_condition = or_(cleanup_condition, Session.refresh_token == existing_refresh_token)

        await db_session.execute(
            delete(Session).where(Session.user_id == user.id, cleanup_condition)
        )

        access_token = _create_token(user, "access", auth_settings.access_ttl)
        refresh_token = _create_token(user, "refresh", auth_settings.refresh_ttl)
        session_token = secrets.token_urlsafe(64)
        
        new_session = Session(
            user_id=user.id,
            session_token=session_token,
            refresh_token=refresh_token,
            expires_at=now + timedelta(seconds=auth_settings.refresh_ttl)
        )
        db_session.add(new_session)
        session_data = _session_response(user, access_token, "Successfully logged in")
        await db_session.commit()
        return access_token, refresh_token, session_data

async def authenticate_user(data: dict, existing_refresh_token: str | None = None) -> tuple[str, str, dict]:
    return await _authenticate_user_db(
        data["username_or_email"], data["password"], existing_refresh_token
    )

# Refresh session logic
@with_db_retry
async def _refresh_session_db(user_id: int, refresh_token: str) -> tuple[str, str, dict]:
    """DB work only. Returns the new (access_token, refresh_token, session_data) once committed."""
    now = datetime.now(timezone.utc)

    engine = get_db_client()
    async with AsyncSession(engine) as db_session:
        query = select(User).options(selectinload(User.preferences)).where(User.id == user_id)
        user_result = await db_session.execute(query)
        user = user_result.scalars().first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        session_query = select(Session).where(
            Session.user_id == user_id,
            Session.refresh_token == refresh_token,
            Session.expires_at > now
        )
        session_result = await db_session.execute(session_query)
        
        db_session_record = session_result.scalars().first()
        if not db_session_record:
            raise HTTPException(status_code=401, detail="Refresh token is invalid or expired")

        new_access_token = _create_token(user, "access", auth_settings.access_ttl)
        new_refresh_token = _create_token(user, "refresh", auth_settings.refresh_ttl)
        
        db_session_record.refresh_token = new_refresh_token
        db_session_record.expires_at = now + timedelta(seconds=auth_settings.refresh_ttl)

        session_data = _session_response(user, new_access_token, "Session refreshed")
        await db_session.commit()
        return new_access_token, new_refresh_token, session_data

async def refresh_user_session(refresh_token: str | None) -> tuple[str, str, dict]:
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing from cookies")

    try:
        payload = jwt.decode(
            refresh_token,
            auth_settings.jwt_secret,
            algorithms=["HS256"],
            options={"require": ["exp", "sub", "type"]}
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token") from exc

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token type mismatch")

    user_id = int(payload["sub"])
    return await _refresh_session_db(user_id, refresh_token)

# Logout logic
@with_db_retry
async def _delete_session_db(refresh_token: str) -> None:
    engine = get_db_client()
    async with AsyncSession(engine) as db_session:
        query = delete(Session).where(Session.refresh_token == refresh_token)
        await db_session.execute(query)
        await db_session.commit()

async def logout_user(refresh_token: str | None) -> bool:
    """Returns True if the DB session was deleted, False if it was a local-only logout."""
    if not refresh_token:
        return False

    try:
        await _delete_session_db(refresh_token)
        return True
    except (SQLAlchemyError, OSError):
        logger.exception("Logout: could not delete the session row (cookies were cleared)")
        return False

# Password reset logic if the user forgot his current password
@with_db_retry
async def _create_reset_otp_db(email: str) -> tuple[str, str] | None:
    """Step 1 DB work. Returns (email, otp_code) if the account exists, else None."""
    engine = get_db_client()
    async with AsyncSession(engine) as db_session:
        query = select(User).where(User.email == email)
        user = (await db_session.execute(query)).scalars().first()
        
        if not user:
            return None

        target_email = user.email
        
        await db_session.execute(delete(OTP).where(OTP.user_id == user.id, OTP.purpose == "forgot_password"))
        
        otp_code = "".join(secrets.choice(string.digits) for _ in range(6))
        new_otp = OTP(
            user_id=user.id,
            code=otp_code,
            purpose="forgot_password",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=3)
        )
        db_session.add(new_otp)
        
        await db_session.commit()
        return target_email, otp_code

async def request_password_reset(email: str) -> tuple[str, str] | None:
    return await _create_reset_otp_db(email)

@with_db_retry
async def _verify_reset_otp_db(email: str, otp_code: str) -> None:
    """Step 2 DB work. Validates the OTP without consuming it so Step 3 can complete."""
    engine = get_db_client()
    async with AsyncSession(engine) as db_session:
        query = select(User).where(User.email == email)
        user = (await db_session.execute(query)).scalars().first()
        
        if not user:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")
            
        otp_query = select(OTP).where(
            OTP.user_id == user.id,
            OTP.code == otp_code,
            OTP.purpose == "forgot_password",
            OTP.expires_at > datetime.now(timezone.utc)
        )
        otp_record = (await db_session.execute(otp_query)).scalars().first()
        
        if not otp_record:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")

async def verify_password_reset_otp(email: str, otp_code: str) -> None:
    await _verify_reset_otp_db(email, otp_code)

@with_db_retry
async def _reset_password_db(
    email: str, otp_code: str, new_password: str, new_password_hash: Callable[[], str]
) -> None:
    """Step 3 DB work. Re-verifies OTP, blocks same password, updates hash, and revokes sessions."""
    engine = get_db_client()
    async with AsyncSession(engine) as db_session:
        query = select(User).where(User.email == email)
        user = (await db_session.execute(query)).scalars().first()
        
        if not user:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")
            
        otp_query = select(OTP).where(
            OTP.user_id == user.id,
            OTP.code == otp_code,
            OTP.purpose == "forgot_password",
            OTP.expires_at > datetime.now(timezone.utc)
        )
        otp_record = (await db_session.execute(otp_query)).scalars().first()
        
        if not otp_record:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")

        if _verify_password(new_password, user.password_hash):
            raise HTTPException(status_code=400, detail="New password cannot be the same as the current one")
            
        user.password_hash = new_password_hash()
        
        await db_session.execute(delete(Session).where(Session.user_id == user.id))
        await db_session.delete(otp_record)
        await db_session.commit()

async def reset_password(email: str, otp_code: str, new_password: str) -> None:
    await _reset_password_db(email, otp_code, new_password, _lazy_hash(new_password))

# Bouncers for routers to add as dependencies
def get_current_user(request: Request) -> dict:
    """Validates the JWT for standard REST endpoints using a bearer token or access cookie."""
    authorization = request.headers.get("Authorization", "")
    scheme, _, bearer_token = authorization.partition(" ")
    token = bearer_token if scheme.lower() == "bearer" else request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        
    try:
        payload = jwt.decode(
            token,
            auth_settings.jwt_secret,
            algorithms=["HS256"],
            options={"require": ["exp", "sub", "type"]}
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    return payload

def create_ws_ticket(user: dict) -> dict:
    ticket = jwt.encode(
        {
            "jti": secrets.token_urlsafe(16),
            "sub": user["sub"],
            "username": user.get("username"),
            "role": user.get("role"),
            "team": user.get("team"),
            "lang": user.get("lang", "en"),
            "persona": user.get("persona", "casual"),
            "type": "ws-ticket",
            "exp": datetime.now(timezone.utc) + timedelta(seconds=auth_settings.ws_ticket_ttl)
        },
        auth_settings.jwt_secret,
        algorithm="HS256"
    )
    return {"ticket": ticket, "expires_in": auth_settings.ws_ticket_ttl}

def get_ws_user(websocket: WebSocket) -> dict:
    """Validates the JWT for WebSocket connections via cookies, with CSWSH protection."""
    allowed_origins = [os.getenv("FRONTEND_DEV_URL", "").rstrip("/")]
    origin = (websocket.headers.get("origin") or "").rstrip("/")
    if origin not in allowed_origins:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized origin")

    token = websocket.query_params.get("ticket")
    if not token:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Missing ticket")
    
    try:
        payload = jwt.decode(
            token,
            auth_settings.jwt_secret,
            algorithms=["HS256"],
            options={"require": ["exp", "sub", "type"]}
        )
    except jwt.PyJWTError:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid ticket")

    if payload.get("type") != "ws-ticket":
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid ticket type")

    return payload