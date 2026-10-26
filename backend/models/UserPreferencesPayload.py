from typing import Literal, Optional
from pydantic import BaseModel

LanguageCode = Literal["en", "es", "pt", "gr"]
PersonaCode = Literal["casual", "analyst", "newcomer", "club_fan"]

class UserPreferencesPayload(BaseModel):
    language: Optional[LanguageCode] = None
    persona: Optional[PersonaCode] = None
    favorite_team: Optional[str] = None
    favorite_player: Optional[str] = None