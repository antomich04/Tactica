from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    username: str
    email: EmailStr
    password: str