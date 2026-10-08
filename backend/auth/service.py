from __future__ import annotations

import hashlib
import re
import secrets
import time
import uuid
from dataclasses import dataclass

from . import passwords, store, tokens
from .config import get_settings

MIN_PASSWORD_LENGTH = 12
_USERNAME = re.compile(r"[A-Za-z0-9_.-]{3,64}")


class InvalidCredentials(Exception):
    pass


class InvalidSession(Exception):
    pass


@dataclass(frozen=True)
class Session:
    user: store.User
    access_token: str
    expires_in: int  # seconds, for the access token
    refresh_token: str  # goes into the HttpOnly cookie, never into the JSON body
    refresh_expires_at: int  # unix seconds


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()  # fine for a 256-bit random value (not a password)


def _issue(user: store.User, family_id: str, refresh_expires_at: int) -> Session:
    raw = secrets.token_urlsafe(32)
    store.add_refresh_token(_hash(raw), family_id, user.id, refresh_expires_at)
    access = tokens.create_access_token(user.id, user.role)
    return Session(user, access, get_settings().access_ttl, raw, refresh_expires_at)


def create_user(username: str, password: str, role: str) -> store.User:
    if not _USERNAME.fullmatch(username):
        raise ValueError("Username must be 3-64 characters: letters, digits, '_', '.' or '-'")
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    if role not in store.ROLES:
        raise ValueError(f"Role must be one of: {', '.join(store.ROLES)}")
    return store.create_user(username, passwords.hash_password(password), role, int(time.time()))


def login(username: str, password: str) -> Session:
    user = store.get_user_by_username(username)
    if user is None:
        passwords.verify_dummy(password)  # same cost as a real check: don't reveal which usernames exist
        raise InvalidCredentials
    if not passwords.verify_password(password, user.password_hash):
        raise InvalidCredentials
    now = int(time.time())
    store.purge_expired(now)
    return _issue(user, uuid.uuid4().hex, now + get_settings().refresh_ttl)


def refresh(raw_token: str) -> Session:
    now = int(time.time())
    row = store.get_refresh_token(_hash(raw_token))
    if row is None:
        raise InvalidSession
    if row.expires_at <= now:
        store.revoke_family(row.family_id)
        raise InvalidSession
    if not store.consume_refresh_token(row.token_hash, now):
        store.revoke_family(row.family_id)  # already used: treat as theft and end the whole session
        raise InvalidSession
    user = store.get_user(row.user_id)
    if user is None:
        raise InvalidSession
    return _issue(user, row.family_id, row.expires_at)  # the session keeps its original end date


def logout(raw_token: str) -> None:
    row = store.get_refresh_token(_hash(raw_token))
    if row is not None:
        store.revoke_family(row.family_id)
