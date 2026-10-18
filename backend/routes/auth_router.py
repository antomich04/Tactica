from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response
from models.RegisterRequest import RegisterRequest
from models.LoginRequest import LoginRequest
from models.ForgotPasswordRequest import ForgotPasswordRequest
from models.ForgotPasswordVerifyRequest import ForgotPasswordVerifyRequest
from models.ForgotPasswordResetRequest import ForgotPasswordResetRequest
from config.rate_limiter import limiter
from services.email_service import send_otp_email
from services.auth_service import (
    set_auth_cookies,
    register_user, 
    authenticate_user, 
    logout_user, 
    refresh_user_session,
    get_current_user,
    create_ws_ticket,
    request_password_reset as service_request_password_reset,
    verify_password_reset_otp as service_verify_password_reset_otp,
    reset_password as service_reset_password
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register")
@limiter.limit("5/minute")
async def register(request: Request, payload: RegisterRequest, response: Response):
    access_token, refresh_token, session_data = await register_user(payload.model_dump())
    set_auth_cookies(response, access_token, refresh_token)
    return session_data

@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, payload: LoginRequest, response: Response):
    existing_refresh_token = request.cookies.get("refresh_token")
    access_token, refresh_token, session_data = await authenticate_user(
        payload.model_dump(), existing_refresh_token
    )
    set_auth_cookies(response, access_token, refresh_token)
    return session_data

@router.post("/refresh")
@limiter.limit("10/minute")
async def refresh(request: Request, response: Response):
    refresh_token = request.cookies.get("refresh_token")
    new_access_token, new_refresh_token, session_data = await refresh_user_session(refresh_token)
    set_auth_cookies(response, new_access_token, new_refresh_token)
    return session_data

@router.post("/ws-ticket")
@limiter.limit("30/minute")
async def issue_ws_ticket(request: Request, user: dict = Depends(get_current_user)):
    return create_ws_ticket(user)

@router.post("/logout")
@limiter.limit("10/minute")
async def logout(request: Request, response: Response):
    refresh_token = request.cookies.get("refresh_token")
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    
    session_destroyed = await logout_user(refresh_token)
    if not session_destroyed:
        return {"status": "success", "message": "Logged out locally"}
    return {"status": "success", "message": "Successfully logged out. Session destroyed."}

@router.post("/forgot-password/request")
@limiter.limit("2/minute")
async def request_password_reset(
    request: Request, payload: ForgotPasswordRequest, background_tasks: BackgroundTasks
):
    result = await service_request_password_reset(payload.email)
    if result:
        target_email, otp_code = result
        background_tasks.add_task(send_otp_email, target_email, otp_code, "forgot_password")
    return {"status": "success", "message": "If an account exists with that email, a password reset link has been sent"}

@router.post("/forgot-password/verify")
@limiter.limit("5/minute")
async def verify_password_reset_otp(request: Request, payload: ForgotPasswordVerifyRequest):
    await service_verify_password_reset_otp(payload.email, payload.otp)
    return {"status": "success", "message": "OTP verified"}

@router.post("/forgot-password/reset")
@limiter.limit("5/minute")
async def reset_password(request: Request, payload: ForgotPasswordResetRequest):
    await service_reset_password(payload.email, payload.otp, payload.new_password)
    return {"status": "success", "message": "Password successfully reset"}