from fastapi import APIRouter, Depends, Response
from models.UpdateEmailRequest import UpdateEmailRequest
from models.UpdateUsernameRequest import UpdateUsernameRequest
from models.UpdatePasswordRequest import UpdatePasswordRequest
from services.auth_service import get_current_user
from services.account_service import (
    update_username, 
    update_email, 
    update_password, 
    delete_user_account
)

router = APIRouter(prefix="/api/account", tags=["Account"])

@router.patch("/change-username")
async def change_username(request: UpdateUsernameRequest, response: Response, user: dict = Depends(get_current_user)):
    return await update_username(int(user["sub"]), request.username, response)

@router.patch("/change-email")
async def change_email(request: UpdateEmailRequest, response: Response, user: dict = Depends(get_current_user)):
    return await update_email(int(user["sub"]), request.email, response)

@router.patch("/change-password")
async def change_password(request: UpdatePasswordRequest, response: Response, user: dict = Depends(get_current_user)):
    return await update_password(int(user["sub"]), request.old_password, request.new_password, response)

@router.delete("/delete-account")
async def delete_account(response: Response, user: dict = Depends(get_current_user)):
    return await delete_user_account(int(user["sub"]), response)