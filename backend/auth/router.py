from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse

from . import service, store, tokens
from .config import get_settings
from .dependencies import Principal, current_principal
from .ratelimit import RateLimiter
from .schemas import LoginRequest, SessionOut, TicketOut, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_PATH = "/api/auth"  # the browser only sends the refresh cookie to these endpoints, never to /api/stream etc.
_NO_STORE = {"Cache-Control": "no-store"}
login_by_user = RateLimiter(max_attempts=5, window_seconds=900)  # 5 failures per IP + username per 15 min
login_by_ip = RateLimiter(max_attempts=30, window_seconds=900)  # 30 failures per IP per 15 min


def require_xhr_header(request: Request) -> None:
    """Cookie-authenticated endpoints demand a custom header. A cross-site form can't send one, and a
    cross-site script can't either unless CORS allows its origin. That shuts the door on CSRF."""
    if request.headers.get("x-requested-with") != "tactica":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Missing X-Requested-With header")


def _set_refresh_cookie(response: Response, session: service.Session) -> None:
    s = get_settings()
    response.set_cookie(
        key=s.cookie_name,
        value=session.refresh_token,
        max_age=max(1, session.refresh_expires_at - int(time.time())),
        httponly=True,  # JavaScript can't read it, so an injected script can't steal it
        secure=s.cookie_secure,
        samesite=s.cookie_samesite,
        path=COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    s = get_settings()
    response.delete_cookie(s.cookie_name, path=COOKIE_PATH, secure=s.cookie_secure, httponly=True, samesite=s.cookie_samesite)


def _session_out(session: service.Session) -> SessionOut:
    u = session.user
    return SessionOut(access_token=session.access_token, expires_in=session.expires_in, user=UserOut(id=u.id, username=u.username, role=u.role))


def _session_expired() -> JSONResponse:
    response = JSONResponse({"detail": "Session expired"}, status_code=status.HTTP_401_UNAUTHORIZED, headers=_NO_STORE)
    _clear_refresh_cookie(response)  # stop the browser sending a dead cookie
    return response


@router.post("/login", response_model=SessionOut)
def login(body: LoginRequest, request: Request, response: Response) -> SessionOut:
    ip = request.client.host if request.client else "unknown"
    user_key = f"{ip}|{body.username.lower()}"
    wait = max(login_by_user.retry_after(user_key), login_by_ip.retry_after(ip))
    if wait:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many failed attempts. Try again later.", headers={"Retry-After": str(wait)})
    try:
        session = service.login(body.username, body.password)
    except service.InvalidCredentials:
        login_by_user.record_failure(user_key)
        login_by_ip.record_failure(ip)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid username or password") from None
    login_by_user.reset(user_key)
    _set_refresh_cookie(response, session)
    response.headers.update(_NO_STORE)
    return _session_out(session)


@router.post("/refresh", response_model=SessionOut, dependencies=[Depends(require_xhr_header)])
def refresh(request: Request, response: Response) -> SessionOut | JSONResponse:
    raw = request.cookies.get(get_settings().cookie_name)
    if not raw:
        return _session_expired()
    try:
        session = service.refresh(raw)
    except service.InvalidSession:
        return _session_expired()
    _set_refresh_cookie(response, session)
    response.headers.update(_NO_STORE)
    return _session_out(session)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_xhr_header)])
def logout(request: Request) -> Response:
    raw = request.cookies.get(get_settings().cookie_name)
    if raw:
        service.logout(raw)
    response = Response(status_code=status.HTTP_204_NO_CONTENT, headers=_NO_STORE)
    _clear_refresh_cookie(response)
    return response


@router.get("/me", response_model=UserOut)
def me(principal: Principal = Depends(current_principal)) -> UserOut:
    user = store.get_user(principal.user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated", headers={"WWW-Authenticate": "Bearer"})
    return UserOut(id=user.id, username=user.username, role=user.role)


@router.post("/ws-ticket", response_model=TicketOut)
def ws_ticket(response: Response, principal: Principal = Depends(current_principal)) -> TicketOut:
    response.headers.update(_NO_STORE)
    return TicketOut(ticket=tokens.create_ws_ticket(principal.user_id), expires_in=get_settings().ws_ticket_ttl)
