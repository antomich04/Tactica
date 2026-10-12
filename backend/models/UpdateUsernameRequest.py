from pydantic import BaseModel, Field

class UpdateUsernameRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)