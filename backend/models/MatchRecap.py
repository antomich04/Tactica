from typing import List, Literal, Optional
from pydantic import BaseModel, Field
from models.Overlays import PersonaType


class MatchRecapKeyEvent(BaseModel):
    type: str
    timestamp: float
    team: str
    player: str
    details: Optional[str] = None


class MatchRecapStats(BaseModel):
    shots: int = 0
    shots_on_target: int = 0
    passes_attempted: int = 0
    passes_completed: int = 0
    corners: int = 0
    yellow_cards: int = 0
    red_cards: int = 0


class MatchRecapTeamStats(BaseModel):
    home: MatchRecapStats
    away: MatchRecapStats


class MatchSummary(BaseModel):
    match_id: str
    home_team: str
    away_team: str
    home_score: int
    away_score: int
    match_time: float
    stats: MatchRecapTeamStats
    key_events: List[MatchRecapKeyEvent] = Field(default_factory=list)


class MatchRecapDraft(BaseModel):
    style: Literal["energetic", "measured", "plain", "passionate"]
    text: str = Field(
        ...,
        description="2-3 sentence post-match broadcast recap grounded strictly in the provided MatchSummary scores, stats, and key events.",
    )


class MatchRecapMessage(BaseModel):
    match_id: str
    language: str
    persona: PersonaType
    text: str
