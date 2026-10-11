from fastapi import APIRouter, Request, Response
from models.RegisterRequest import RegisterRequest
from models.LoginRequest import LoginRequest
from models.ForgotPasswordRequest import ForgotPasswordRequest
from models.ForgotPasswordResetRequest import ForgotPasswordResetRequest
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
async def register(request: RegisterRequest, response: Response):
    return await register_user(request.model_dump(), response)

@router.post("/login")
async def login(request: LoginRequest, response: Response):
    return await authenticate_user(request.model_dump(), response)

@router.post("/refresh")
async def refresh(request: Request, response: Response):
    return await refresh_user_session(request, response)

@router.post("/logout")
async def logout(request: Request, response: Response):
    return await logout_user(request, response)

@router.post("/forgot-password/request")
async def request_password_reset(request: ForgotPasswordRequest):
    return await service_request_password_reset(request.email)

@router.post("/forgot-password/reset")
async def reset_password(request: ForgotPasswordResetRequest):
    return await service_reset_password(request.email, request.otp, request.new_password)