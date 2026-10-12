from fastapi import APIRouter, Depends, Response, Request
from models.UpdateEmailRequest import UpdateEmailRequest
from models.UpdateUsernameRequest import UpdateUsernameRequest
from models.UpdatePasswordRequest import UpdatePasswordRequest
from models.VerifyEmailRequest import VerifyEmailRequest
from models.VerifyEmailConfirmRequest import VerifyEmailConfirmRequest
from config.rate_limiter import limiter
from services.auth_service import get_current_user
from services.account_service import (
    update_username, 
    update_email, 
    update_password, 
    delete_user_account,
    request_verify_email,
    confirm_verify_email
)

router = APIRouter(prefix="/api/account", tags=["Account"])

@router.patch("/change-username")
@limiter.limit("5/minute")
async def change_username(request: Request, payload: UpdateUsernameRequest, response: Response, user: dict = Depends(get_current_user)):
    return await update_username(int(user["sub"]), payload.username, response)

@router.patch("/change-email")
@limiter.limit("5/minute")
async def change_email(request: Request, payload: UpdateEmailRequest, response: Response, user: dict = Depends(get_current_user)):
    return await update_email(int(user["sub"]), payload.email, response)

@router.patch("/change-password")
@limiter.limit("5/minute")
async def change_password(request: Request, payload: UpdatePasswordRequest, response: Response, user: dict = Depends(get_current_user)):
    return await update_password(int(user["sub"]), payload.old_password, payload.new_password, response)

@router.delete("/delete-account")
@limiter.limit("2/minute")
async def delete_account(request: Request, response: Response, user: dict = Depends(get_current_user)):
    return await delete_user_account(int(user["sub"]), response)

@router.post("/verify-email/request")
@limiter.limit("2/minute")
async def request_email_verification(request: Request, payload: VerifyEmailRequest, user: dict = Depends(get_current_user)):
    return await request_verify_email(int(user["sub"]), payload.email)

@router.post("/verify-email/confirm")
@limiter.limit("5/minute")
async def confirm_email_verification(request: Request, payload: VerifyEmailConfirmRequest, user: dict = Depends(get_current_user)):
    return await confirm_verify_email(int(user["sub"]), payload.otp)