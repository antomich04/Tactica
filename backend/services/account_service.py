import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Callable
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from config.database_client import get_db_client
from config.auth_settings import auth_settings
from config.db_retry_mechanism import with_db_retry
from models.User import User, OTP
from models.Session import Session 
from services.auth_service import (
    _lazy_hash,
    _verify_password, 
    _create_token, 
)

#Helper function
async def _rotate_sessions(db_session: AsyncSession, user: User) -> tuple[str, str]:
    """Deletes all old sessions for the user and stages a fresh one.

    Returns (access_token, refresh_token). The caller must commit, and only then
    set the cookies.
    """
    await db_session.execute(delete(Session).where(Session.user_id == user.id))
    
    access_token = _create_token(user, "access", auth_settings.access_ttl)
    refresh_token = _create_token(user, "refresh", auth_settings.refresh_ttl)
    session_token = secrets.token_urlsafe(64)
    
    new_session = Session(
        user_id=user.id,
        session_token=session_token,
        refresh_token=refresh_token,
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=auth_settings.refresh_ttl)
    )
    db_session.add(new_session)

    return access_token, refresh_token

#Change username logic
@with_db_retry
async def _update_username_db(user_id: int, new_username: str) -> tuple[str, str]:
    engine = get_db_client()
    async with AsyncSession(engine) as db_session:
        query = select(User).options(selectinload(User.preferences)).where(User.id == user_id)
        user = (await db_session.execute(query)).scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if user.username == new_username:
            raise HTTPException(status_code=400, detail="New username cannot be the same as the current one")
            
        collision_query = select(User).where(User.username == new_username)
        if (await db_session.execute(collision_query)).scalars().first():
            raise HTTPException(status_code=400, detail="Username is already taken")
            
        user.username = new_username
        await db_session.flush() 
        
        tokens = await _rotate_sessions(db_session, user)
        await db_session.commit()
        return tokens

async def update_username(user_id: int, new_username: str) -> tuple[str, str]:
    return await _update_username_db(user_id, new_username)

#Change email logic
@with_db_retry
async def _update_email_db(user_id: int, new_email: str) -> tuple[str, str]:
    engine = get_db_client()
    async with AsyncSession(engine) as db_session:
        query = select(User).options(selectinload(User.preferences)).where(User.id == user_id)
        user = (await db_session.execute(query)).scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if user.email == new_email:
            raise HTTPException(status_code=400, detail="New email cannot be the same as the current one")
            
        collision_query = select(User).where(User.email == new_email)
        if (await db_session.execute(collision_query)).scalars().first():
            raise HTTPException(status_code=400, detail="Email is already in use")
            
        user.email = new_email
        await db_session.flush()
        
        tokens = await _rotate_sessions(db_session, user)
        await db_session.commit()
        return tokens

async def update_email(user_id: int, new_email: str) -> tuple[str, str]:
    return await _update_email_db(user_id, new_email)

#Change password logic
@with_db_retry
async def _update_password_db(
    user_id: int, old_password: str, new_password: str, new_password_hash: Callable[[], str]
) -> tuple[str, str]:
    engine = get_db_client()
    async with AsyncSession(engine) as db_session:
        query = select(User).options(selectinload(User.preferences)).where(User.id == user_id)
        user = (await db_session.execute(query)).scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if old_password == new_password:
            raise HTTPException(status_code=400, detail="New password cannot be the same as the current one")
            
        if not _verify_password(old_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Incorrect current password")
            
        user.password_hash = new_password_hash()
        await db_session.flush()
        
        tokens = await _rotate_sessions(db_session, user)
        await db_session.commit()
        return tokens

async def update_password(user_id: int, old_password: str, new_password: str) -> tuple[str, str]:
    return await _update_password_db(
        user_id, old_password, new_password, _lazy_hash(new_password)
    )

#Delete account logic
@with_db_retry
async def _delete_user_db(user_id: int) -> None:
    engine = get_db_client()
    async with AsyncSession(engine) as db_session:
        user = await db_session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        await db_session.delete(user)
        await db_session.commit()

async def delete_user_account(user_id: int) -> None:
    await _delete_user_db(user_id)

#Verify email logic
@with_db_retry
async def _create_verify_otp_db(user_id: int, current_email: str) -> tuple[str, str] | None:
    """DB work only. Returns (email, otp_code), or None if the email does not match."""
    engine = get_db_client()
    async with AsyncSession(engine) as db_session:
        user = await db_session.get(User, user_id)
        
        if not user or user.email != current_email:
            return None
            
        target_email = user.email
        
        await db_session.execute(delete(OTP).where(OTP.user_id == user_id, OTP.purpose == "verify_email"))
        
        otp_code = "".join(secrets.choice(string.digits) for _ in range(6))
        new_otp = OTP(
            user_id=user_id,
            code=otp_code,
            purpose="verify_email",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=3)
        )
        db_session.add(new_otp)
        
        await db_session.commit()
        return target_email, otp_code

async def request_verify_email(user_id: int, current_email: str) -> tuple[str, str] | None:
    return await _create_verify_otp_db(user_id, current_email)

@with_db_retry
async def _confirm_verify_email_db(user_id: int, otp_code: str) -> None:
    engine = get_db_client()
    async with AsyncSession(engine) as db_session:
        query = select(OTP).where(
            OTP.user_id == user_id,
            OTP.code == otp_code,
            OTP.purpose == "verify_email",
            OTP.expires_at > datetime.now(timezone.utc)
        )
        otp_record = (await db_session.execute(query)).scalars().first()
        
        if not otp_record:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")
            
        user = await db_session.get(User, user_id)
        user.email_verified = True
        
        await db_session.delete(otp_record)
        await db_session.commit()

async def confirm_verify_email(user_id: int, otp_code: str) -> None:
    await _confirm_verify_email_db(user_id, otp_code)