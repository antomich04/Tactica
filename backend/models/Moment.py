from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from models.Event import MatchEvent


class MomentCategory(str, Enum):
    GOAL = "goal"
    RED_CARD = "red_card"
    PENALTY = "penalty"
    HIGH_XG_SAVE = "high_xg_save"
    DANGEROUS_FREE_KICK = "dangerous_free_kick"
    MOMENTUM_SPIKE = "momentum_spike"
    SUBSTITUTION = "substitution"


class Moment(BaseModel):
    id: str = Field(..., description="Unique moment identifier, e.g., mom_001")
    match_id: str
    timestamp: float
    category: MomentCategory
    primary_event: MatchEvent
    evidence_event_ids: List[str] = Field(default_factory=list)
    stats_context: Dict[str, Any] = Field(default_factory=dict)