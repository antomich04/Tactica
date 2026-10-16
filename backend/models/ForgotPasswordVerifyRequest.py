from pydantic import BaseModel, EmailStr, Field

class ForgotPasswordVerifyRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)