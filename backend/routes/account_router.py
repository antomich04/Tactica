from fastapi import APIRouter, BackgroundTasks, Depends, Response, Request
from models.UpdateEmailRequest import UpdateEmailRequest
from models.UpdateUsernameRequest import UpdateUsernameRequest
from models.UpdatePasswordRequest import UpdatePasswordRequest
from models.VerifyEmailRequest import VerifyEmailRequest
from models.VerifyEmailConfirmRequest import VerifyEmailConfirmRequest
from config.rate_limiter import limiter
from services.email_service import send_otp_email
from services.auth_service import get_current_user, set_auth_cookies
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
async def change_username(
    request: Request, payload: UpdateUsernameRequest, response: Response, user: dict = Depends(get_current_user)
):
    access_token, refresh_token = await update_username(int(user["sub"]), payload.username)
    set_auth_cookies(response, access_token, refresh_token)
    return {"status": "success", "message": "Username updated successfully"}

@router.patch("/change-email")
@limiter.limit("5/minute")
async def change_email(
    request: Request, payload: UpdateEmailRequest, response: Response, user: dict = Depends(get_current_user)
):
    access_token, refresh_token = await update_email(int(user["sub"]), payload.email)
    set_auth_cookies(response, access_token, refresh_token)
    return {"status": "success", "message": "Email updated successfully"}

@router.patch("/change-password")
@limiter.limit("5/minute")
async def change_password(
    request: Request, payload: UpdatePasswordRequest, response: Response, user: dict = Depends(get_current_user)
):
    access_token, refresh_token = await update_password(int(user["sub"]), payload.old_password, payload.new_password)
    set_auth_cookies(response, access_token, refresh_token)
    return {"status": "success", "message": "Password updated successfully"}

@router.delete("/delete-account")
@limiter.limit("2/minute")
async def delete_account(request: Request, response: Response, user: dict = Depends(get_current_user)):
    await delete_user_account(int(user["sub"]))
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"status": "success", "message": "Account permanently deleted"}

@router.post("/verify-email/request")
@limiter.limit("2/minute")
async def request_email_verification(
    request: Request,
    payload: VerifyEmailRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    result = await request_verify_email(int(user["sub"]), payload.email)
    if result:
        target_email, otp_code = result
        background_tasks.add_task(send_otp_email, target_email, otp_code, "verify_email")
    return {"status": "success", "message": "OTP sent to email if it matches your current address"}

@router.post("/verify-email/confirm")
@limiter.limit("5/minute")
async def confirm_email_verification(
    request: Request, payload: VerifyEmailConfirmRequest, user: dict = Depends(get_current_user)
):
    await confirm_verify_email(int(user["sub"]), payload.otp)
    return {"status": "success", "message": "Email successfully verified"}