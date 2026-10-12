from pydantic import BaseModel, EmailStr

class UpdateEmailRequest(BaseModel):
    email: EmailStr