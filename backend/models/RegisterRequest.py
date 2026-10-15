import re
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional
from models.UserPreferencesPayload import UserPreferencesPayload

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    email: EmailStr = Field(...)
    password: str = Field(..., min_length=8)
    preferences: Optional[UserPreferencesPayload] = None

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one capital letter.')
        if not re.search(r'[!@#$%^&*]', v):
            raise ValueError('Password must contain at least one special character (!@#$%^&*).')
        if re.search(r'[()]', v):
            raise ValueError('Password must not contain parentheses.')
        return v