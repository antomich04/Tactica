from typing import List, Literal, Optional
from pydantic import BaseModel, Field
from models.Moment import Moment
from models.MatchRecap import MatchRecapDraft, MatchSummary
from models.Overlays import Overlay, OverlayType, PersonaType

LanguageType = Literal["en", "es", "pt", "gr"]

class UserContext(BaseModel):
    persona: PersonaType = PersonaType.CASUAL
    language: LanguageType = "en"
    favorite_club: Optional[str] = None
    player_lock: Optional[str] = None

class DirectorDecision(BaseModel):
    route: Literal["skip", "fast_narrator", "deep_analyst"]
    overlay_type: Literal[
        OverlayType.MOMENTUM_SHIFT,
        OverlayType.PLAYER_TAG,
        OverlayType.SHOT_SPEED,
        OverlayType.GOAL,
        OverlayType.CARD,
        OverlayType.MILESTONE,
        OverlayType.RECAP_ITEM,
    ]
    priority: int = Field(default=1, ge=1, le=5)
    rationale: str

class AnalystEvidence(BaseModel):
    summary: str = Field(..., description="Tactical synthesis of Pulse, control, chaos, and player stats")
    evidence_event_ids: List[str] = Field(..., description="Exact event IDs supporting the analysis")
    chaos_index: float
    control_index: float
    controlling_team: Optional[str] = None
    momentum_score: float = 0.0

class NarratorDraft(BaseModel):
    text: str = Field(..., description="1-2 sentence broadcast 'why it matters' narrative")
    cited_event_ids: List[str] = Field(..., description="Exact event IDs from evidence used in the text")

class VerificationResult(BaseModel):
    is_verified: bool = Field(..., description="True only if all numbers/claims match the evidence")
    feedback: Optional[str] = Field(None, description="Instructions to fix ungrounded claims if rejected")

class PersonalizedOverlay(BaseModel):
    user_ctx: UserContext
    overlay: Overlay

class TacticaGraphState(BaseModel):
    """State passed between Microsoft Agent Framework Executors."""
    moment: Moment
    user_contexts: List[UserContext] = Field(default_factory=list)
    director: Optional[DirectorDecision] = None
    evidence: Optional[AnalystEvidence] = None
    draft: Optional[NarratorDraft] = None
    verification: Optional[VerificationResult] = None
    revision_count: int = 0
    trace: List[str] = Field(default_factory=list)


class MatchRecapWorkflowState(BaseModel):
    summary: MatchSummary
    user_context: UserContext
    draft: Optional[MatchRecapDraft] = None
    verification: Optional[VerificationResult] = None