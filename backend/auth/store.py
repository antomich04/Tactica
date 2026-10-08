from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Iterator, Literal, get_args

from .config import get_settings

Role = Literal["viewer", "producer"]
ROLES = get_args(Role)

_SCHEMA = f"""
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ({", ".join(repr(r) for r in ROLES)})),
    created_at    INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_hash TEXT PRIMARY KEY,
    family_id  TEXT NOT NULL,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    used_at    INTEGER
);
CREATE INDEX IF NOT EXISTS idx_refresh_family ON refresh_tokens(family_id);
"""


@dataclass(frozen=True)
class User:
    id: int
    username: str
    role: Role
    password_hash: str


@dataclass(frozen=True)
class RefreshRow:
    token_hash: str
    family_id: str
    user_id: int
    expires_at: int
    used_at: int | None


class UserExists(Exception):
    pass


@contextmanager
def _connect() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(get_settings().db_path, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    path = get_settings().db_path
    path.parent.mkdir(parents=True, exist_ok=True)
    with _connect() as conn:
        conn.execute("PRAGMA journal_mode = WAL")
        conn.executescript(_SCHEMA)


def _user(row: sqlite3.Row | None) -> User | None:
    return None if row is None else User(row["id"], row["username"], row["role"], row["password_hash"])


def create_user(username: str, password_hash: str, role: Role, now: int) -> User:
    try:
        with _connect() as conn:
            cur = conn.execute(
                "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
                (username, password_hash, role, now),
            )
            return User(cur.lastrowid, username, role, password_hash)
    except sqlite3.IntegrityError as exc:
        raise UserExists(username) from exc


def get_user_by_username(username: str) -> User | None:
    with _connect() as conn:
        return _user(conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone())


def get_user(user_id: int) -> User | None:
    with _connect() as conn:
        return _user(conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone())


def add_refresh_token(token_hash: str, family_id: str, user_id: int, expires_at: int) -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT INTO refresh_tokens (token_hash, family_id, user_id, expires_at) VALUES (?, ?, ?, ?)",
            (token_hash, family_id, user_id, expires_at),
        )


def get_refresh_token(token_hash: str) -> RefreshRow | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM refresh_tokens WHERE token_hash = ?", (token_hash,)).fetchone()
    return None if row is None else RefreshRow(**dict(row))


def consume_refresh_token(token_hash: str, now: int) -> bool:
    """Retire a token. Atomic: of two simultaneous attempts with the same token, exactly one gets True."""
    with _connect() as conn:
        cur = conn.execute(
            "UPDATE refresh_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL", (now, token_hash)
        )
        return cur.rowcount == 1


def revoke_family(family_id: str) -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM refresh_tokens WHERE family_id = ?", (family_id,))


def purge_expired(now: int) -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM refresh_tokens WHERE expires_at <= ?", (now,))
