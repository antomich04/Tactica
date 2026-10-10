from pydantic import BaseModel
from typing import Optional

class UserPreferencesPayload(BaseModel):
    favorite_team: Optional[str] = None
    language: str = "en"
    persona: str = "casual"