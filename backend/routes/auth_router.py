from fastapi import APIRouter, Request, Response
from models.RegisterRequest import RegisterRequest
from models.LoginRequest import LoginRequest
from models.ForgotPasswordRequest import ForgotPasswordRequest
from models.ForgotPasswordResetRequest import ForgotPasswordResetRequest
from config.rate_limiter import limiter
from services.auth_service import (
    register_user, 
    authenticate_user, 
    logout_user, 
    refresh_user_session,
    request_password_reset as service_request_password_reset,
    reset_password as service_reset_password
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register")
@limiter.limit("5/minute")
async def register(request: Request, payload: RegisterRequest, response: Response):
    return await register_user(payload.model_dump(), response)

@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, payload: LoginRequest, response: Response):
    return await authenticate_user(payload.model_dump(), response)

@router.post("/refresh")
@limiter.limit("10/minute")
async def refresh(request: Request, response: Response):
    return await refresh_user_session(request, response)

@router.post("/logout")
@limiter.limit("10/minute")
async def logout(request: Request, response: Response):
    return await logout_user(request, response)

@router.post("/forgot-password/request")
@limiter.limit("2/minute")
async def request_password_reset(request: Request, payload: ForgotPasswordRequest):
    return await service_request_password_reset(payload.email)

@router.post("/forgot-password/reset")
@limiter.limit("5/minute")
async def reset_password(request: Request, payload: ForgotPasswordResetRequest):
    return await service_reset_password(payload.email, payload.otp, payload.new_password)