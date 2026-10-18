import os
import secrets
import string
import uuid
from datetime import datetime, timedelta, timezone
from typing import Callable
from fastapi import HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from config.database_client import get_db_client
from config.auth_settings import auth_settings
from config.db_retry_mechanism import with_db_retry
from models.User import User, UserPreference, OTP
from models.Session import Session
from models.UserPreferencesPayload import UserPreferencesPayload
from services.auth_service import (
    _lazy_hash,
    _verify_password,
    _create_token,
    serialize_user,
)
from azure.storage.blob.aio import BlobServiceClient
from azure.storage.blob import ContentSettings

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_AVATAR_BYTES = 5 * 1024 * 1024  # 5 MB


# Helper functions
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


@with_db_retry
async def get_account_profile(user_id: int) -> dict:
    engine = get_db_client()

    async with AsyncSession(engine) as db_session:
        query = select(User).options(selectinload(User.preferences)).where(User.id == user_id)
        user = (await db_session.execute(query)).scalars().first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {"status": "success", "user": serialize_user(user)}


# Updates preferences (language, persona/role, favorite_team, favorite_player)
@with_db_retry
async def _update_preferences_db(
    user_id: int, payload: UserPreferencesPayload
) -> tuple[str, str, dict]:
    engine = get_db_client()

    async with AsyncSession(engine) as db_session:
        query = select(User).options(selectinload(User.preferences)).where(User.id == user_id)
        user = (await db_session.execute(query)).scalars().first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if not user.preferences:
            user.preferences = UserPreference(user_id=user.id)
            db_session.add(user.preferences)

        updates = payload.model_dump(exclude_unset=True)

        if "language" in updates and updates["language"] is not None:
            user.preferences.language = updates["language"]

        if "persona" in updates and updates["persona"] is not None:
            user.preferences.persona = updates["persona"]

        if "favorite_team" in updates:
            user.preferences.favorite_team = updates["favorite_team"] or None

        if "favorite_player" in updates:
            user.preferences.favorite_player = updates["favorite_player"] or None

        await db_session.flush()

        access_token, refresh_token = await _rotate_sessions(db_session, user)
        response_data = {
            "status": "success",
            "message": "Preferences updated successfully",
            "preferences": serialize_user(user)["preferences"],
        }
        await db_session.commit()
        return access_token, refresh_token, response_data


async def update_user_preferences(
    user_id: int, payload: UserPreferencesPayload
) -> tuple[str, str, dict]:
    return await _update_preferences_db(user_id, payload)


# Profile Picture Upload
async def _store_avatar_bytes(user_id: int, content: bytes, content_type: str, ext: str) -> str:
    conn_str = (os.getenv("AZURE_STORAGE_CONNECTION_STRING")).strip()
    container_name = (os.getenv("AZURE_STORAGE_AVATAR_CONTAINER")).strip()

    if not conn_str:
        raise HTTPException(
            status_code=500,
            detail="Azure Blob Storage is not configured.",
        )

    blob_name = f"user_{user_id}_{uuid.uuid4().hex[:10]}{ext}"

    async with BlobServiceClient.from_connection_string(conn_str) as service_client:
        container_client = service_client.get_container_client(container_name)
        blob_client = container_client.get_blob_client(blob_name)
        await blob_client.upload_blob(
            content,
            overwrite=True,
            content_settings=ContentSettings(content_type=content_type),
        )
        return blob_client.url


@with_db_retry
async def _save_avatar_url_db(user_id: int, avatar_url: str) -> dict:
    engine = get_db_client()

    async with AsyncSession(engine) as db_session:
        query = select(User).options(selectinload(User.preferences)).where(User.id == user_id)
        user = (await db_session.execute(query)).scalars().first()
       
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.avatar_url = avatar_url
        await db_session.commit()
        return {
            "status": "success",
            "message": "Profile picture updated successfully",
            "avatar_url": avatar_url,
        }


async def upload_profile_picture(user_id: int, file: UploadFile) -> dict:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image format. Please upload a JPEG, PNG, or WebP image.",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=400, detail="Image size exceeds the 5MB limit.")

    ext = ALLOWED_IMAGE_TYPES[file.content_type]
    avatar_url = await _store_avatar_bytes(user_id, content, file.content_type, ext)
    return await _save_avatar_url_db(user_id, avatar_url)


# Change username logic
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

# Change email logic
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
        user.email_verified = False
        await db_session.flush()
        
        tokens = await _rotate_sessions(db_session, user)
        await db_session.commit()
        return tokens

async def update_email(user_id: int, new_email: str) -> tuple[str, str]:
    return await _update_email_db(user_id, new_email)

# Change password logic
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

# Delete account logic
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

# Verify email logic
@with_db_retry
async def _create_verify_otp_db(user_id: int, current_email: str) -> tuple[str, str] | None:
    """DB work only. Raises 400 if already verified, returns None on email mismatch."""
    engine = get_db_client()
    async with AsyncSession(engine) as db_session:
        user = await db_session.get(User, user_id)
        
        if not user or user.email != current_email:
            return None
            
        if user.email_verified:
            raise HTTPException(status_code=400, detail="Email is already verified")
            
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

async def request_verify_email(user_id: int, current_email: str) -> tuple[str, str]:
    return await _create_verify_otp_db(user_id, current_email)

@with_db_retry
async def _confirm_verify_email_db(user_id: int, otp_code: str) -> None:
    engine = get_db_client()
    async with AsyncSession(engine) as db_session:
        user = await db_session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if user.email_verified:
            raise HTTPException(status_code=400, detail="Email is already verified")

        query = select(OTP).where(
            OTP.user_id == user_id,
            OTP.code == otp_code,
            OTP.purpose == "verify_email",
            OTP.expires_at > datetime.now(timezone.utc)
        )
        otp_record = (await db_session.execute(query)).scalars().first()
        
        if not otp_record:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")
            
        user.email_verified = True
        
        await db_session.delete(otp_record)
        await db_session.commit()

async def confirm_verify_email(user_id: int, otp_code: str) -> None:
    await _confirm_verify_email_db(user_id, otp_code)