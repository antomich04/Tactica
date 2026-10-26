from enum import Enum
from typing import Any, Dict, List
from pydantic import BaseModel, Field


class OverlayType(str, Enum):
    MOMENTUM_SHIFT = "momentum_shift"
    PLAYER_TAG = "player_tag"
    SHOT_SPEED = "shot_speed"
    GOAL = "goal"
    CARD = "card"
    MILESTONE = "milestone"
    RECAP_ITEM = "recap_item"
    PENALTY_SAVE = "penalty_save"
    YELLOW_CARD = "yellow_card"
    SUBSTITUTION = "substitution"
    TACTICAL_CONTROL = "tactical_control"
    HALF_TIME = "half_time"


class PersonaType(str, Enum):
    ANALYST = "analyst"
    CASUAL = "casual"
    NEWCOMER = "newcomer"
    CLUB_FAN = "club_fan"


class Overlay(BaseModel):
    id: str = Field(..., description="Unique overlay identifier, e.g., ov_001")
    match_id: str = Field(..., description="Unique match identifier, e.g., m_001")
    timestamp: float = Field(..., ge=0.0, description="Match time in seconds from kickoff")
    duration: float = Field(..., ge=0.1, description="Time in seconds the overlay stays on screen")
    type: OverlayType
    priority: int = Field(
        ..., ge=1, le=5, description="1 (high) to 5 (low) for rendering collision resolution"
    )
    language: str = Field(..., description="Language code, e.g., 'en', 'es'")
    persona: PersonaType
    text: str = Field(..., description="The localized, persona-specific LLM-generated string")
    evidence_event_ids: List[str] = Field(default_factory=list, description="List of Event IDs backing this claim")
    verified: bool = Field(False, description="True if passed the Verifier agent")
    meta: Dict[str, Any] = Field(default_factory=dict, description="Flexible payload for frontend visualization")