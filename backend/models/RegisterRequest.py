from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from models.UserPreferencesPayload import UserPreferencesPayload

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    email: EmailStr
    password: str = Field(..., min_length=8)
    preferences: Optional[UserPreferencesPayload] = None