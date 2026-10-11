import secrets
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from config.database_client import get_db_client
from config.auth_settings import auth_settings
from models.User import User
from models.Session import Session
from services.auth_service import (
    _hash_password, 
    _verify_password, 
    _create_token, 
    _set_auth_cookies
)

async def _rotate_sessions(db_session: AsyncSession, user: User, response: Response):
    """Deletes all old sessions for the user and issues a fresh session/cookies."""

    # Invalidates all existing sessions to force logout on other devices
    await db_session.execute(delete(Session).where(Session.user_id == user.id))
    
    # Generates new tokens with the updated user claims
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
    
    # Attaches the new cookies to the response
    _set_auth_cookies(response, access_token, refresh_token)

async def update_username(user_id: int, new_username: str, response: Response) -> dict:
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
        
        await _rotate_sessions(db_session, user, response)
        await db_session.commit()
        return {"status": "success", "message": "Username updated successfully"}

async def update_email(user_id: int, new_email: str, response: Response) -> dict:
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
        
        await _rotate_sessions(db_session, user, response)
        await db_session.commit()
        return {"status": "success", "message": "Email updated successfully"}

async def update_password(user_id: int, old_password: str, new_password: str, response: Response) -> dict:
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
            
        user.password_hash = _hash_password(new_password)
        await db_session.flush()
        
        await _rotate_sessions(db_session, user, response)
        await db_session.commit()
        return {"status": "success", "message": "Password updated successfully"}

async def delete_user_account(user_id: int, response: Response) -> dict:
    engine = get_db_client()
    async with AsyncSession(engine) as db_session:
        user = await db_session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        await db_session.delete(user)
        await db_session.commit()
        
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        
        return {"status": "success", "message": "Account permanently deleted"}