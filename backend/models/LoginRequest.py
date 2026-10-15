from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    username_or_email: str
    password: str