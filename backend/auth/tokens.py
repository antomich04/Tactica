from __future__ import annotations

import time
import uuid
from typing import Any

import jwt

from .config import get_settings

ALGORITHM = "HS256"
ACCESS = "access"
WS_TICKET = "ws_ticket"
_REQUIRED = ["exp", "iat", "nbf", "iss", "aud", "sub", "jti", "type"]
_LEEWAY_SECONDS = 5  # tolerated clock difference


class TokenError(Exception):
    """The token is missing, malformed, expired, forged, or of the wrong kind. The reason is deliberately not exposed."""


def _create(sub: str, token_type: str, ttl: int, **extra: Any) -> str:
    s = get_settings()
    now = int(time.time())
    claims = {
        "iss": s.issuer,
        "aud": s.audience,
        "sub": sub,
        "iat": now,
        "nbf": now,
        "exp": now + ttl,
        "jti": uuid.uuid4().hex,  # unique id per token
        "type": token_type,
        **extra,
    }
    return jwt.encode(claims, s.secret, algorithm=ALGORITHM)


def create_access_token(user_id: int, role: str) -> str:
    return _create(str(user_id), ACCESS, get_settings().access_ttl, role=role)


def create_ws_ticket(user_id: int) -> str:
    return _create(str(user_id), WS_TICKET, get_settings().ws_ticket_ttl)


def decode_token(token: str, expected_type: str) -> dict[str, Any]:
    s = get_settings()
    try:
        claims = jwt.decode(
            token,
            s.secret,
            algorithms=[ALGORITHM],
            audience=s.audience,
            issuer=s.issuer,
            leeway=_LEEWAY_SECONDS,
            options={"require": _REQUIRED},
        )
    except jwt.PyJWTError as exc:
        raise TokenError("invalid token") from exc
    if claims["type"] != expected_type:
        raise TokenError("wrong token type")
    return claims
