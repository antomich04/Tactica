from pydantic import BaseModel, Field, field_validator
import re

class UpdatePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)

    @field_validator('new_password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one capital letter.')
        if not re.search(r'[!@#$%^&*]', v):
            raise ValueError('Password must contain at least one special character (!@#$%^&*).')
        if re.search(r'[()]', v):
            raise ValueError('Password must not contain parentheses.')
        return v