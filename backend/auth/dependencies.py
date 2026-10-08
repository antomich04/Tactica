from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, HTTPException, Query, WebSocketException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .tokens import ACCESS, WS_TICKET, TokenError, decode_token

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Principal:
    user_id: int
    role: str


def current_principal(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> Principal:
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED, "Not authenticated", headers={"WWW-Authenticate": "Bearer"}
    )
    if credentials is None:
        raise unauthorized
    try:
        claims = decode_token(credentials.credentials, ACCESS)
    except TokenError:
        raise unauthorized from None  # same answer for every failure: don't help an attacker
    return Principal(int(claims["sub"]), claims["role"])


def websocket_principal(ticket: str | None = Query(default=None)) -> Principal:
    rejected = WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or missing ticket")
    if not ticket:
        raise rejected
    try:
        claims = decode_token(ticket, WS_TICKET)
    except TokenError:
        raise rejected from None
    return Principal(int(claims["sub"]), role="")
