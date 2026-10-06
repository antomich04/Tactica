from enum import Enum
from typing import Annotated, Literal, Optional, Union
from pydantic import BaseModel, Field


class EventType(str, Enum):
    PASS = "pass"
    SHOT = "shot"
    TACKLE = "tackle"
    POSSESSION_CHANGE = "possession_change"
    PRESSURE = "pressure"
    CARD = "card"
    FOUL = "foul"
    SUBSTITUTION = "substitution"
    GOAL = "goal"


class PassOutcome(str, Enum):
    COMPLETED = "completed"
    INCOMPLETE = "incomplete"
    INTERCEPTED = "intercepted"
    OUT_OF_BOUNDS = "out_of_bounds"


class ShotOutcome(str, Enum):
    GOAL = "goal"
    SAVED = "saved"
    BLOCKED = "blocked"
    OFF_TARGET = "off_target"
    POST = "post"


class CardColor(str, Enum):
    YELLOW = "yellow"
    RED = "red"


# Base structure shared across all pitch events
class BaseMatchEvent(BaseModel):
    id: str = Field(..., description="Unique event identifier, e.g., e_1201")
    match_id: str = Field(..., description="Unique match identifier, e.g., m_001")
    timestamp: float = Field(..., ge=0.0, description="Match time in seconds from kickoff")
    team: str = Field(..., description="Team identifier or club name")
    player: str = Field(..., description="Player name or identifier")
    # Coordinates normalized from 0.0 to 100.0 (x = length, y = width)
    x: float = Field(..., ge=0.0, le=100.0, description="Pitch X coordinate (0-100)")
    y: float = Field(..., ge=0.0, le=100.0, description="Pitch Y coordinate (0-100)")


# Specialized payloads for distinct tactical events
class PassEvent(BaseMatchEvent):
    type: Literal[EventType.PASS] = EventType.PASS
    end_x: float = Field(..., ge=0.0, le=100.0)
    end_y: float = Field(..., ge=0.0, le=100.0)
    speed_kmh: float = Field(None, ge=0.0, description="Pass speed in km/h")
    distance: float = Field(..., ge=0.0, description="Distance in meters")
    outcome: PassOutcome
    difficulty_rating: Optional[float] = Field(None, ge=0.0, le=1.0)
    receiver: Optional[str] = None


class ShotEvent(BaseMatchEvent):
    type: Literal[EventType.SHOT] = EventType.SHOT
    speed_kmh: float = Field(None, ge=0.0, description="Shot speed in km/h")
    xg: float = Field(..., ge=0.0, le=1.0, description="Expected Goals value")
    outcome: ShotOutcome
    distance: float = Field(None, ge=0.0, description="Distance to goal in meters")


class TackleEvent(BaseMatchEvent):
    type: Literal[EventType.TACKLE] = EventType.TACKLE
    outcome: Literal["won", "lost"]
    opponent_player: Optional[str] = None


class PressureEvent(BaseMatchEvent):
    type: Literal[EventType.PRESSURE] = EventType.PRESSURE
    duration: float = Field(..., ge=0.0, description="Duration of press in seconds")
    opponent_player: Optional[str] = None


class CardEvent(BaseMatchEvent):
    type: Literal[EventType.CARD] = EventType.CARD
    card_color: CardColor
    reason: Optional[str] = None


class GoalEvent(BaseMatchEvent):
    type: Literal[EventType.GOAL] = EventType.GOAL
    shot_event_id: Optional[str] = None
    scorer: str = Field(..., description="Player who scored the goal")
    assist_player: Optional[str] = None


class PossessionChangeEvent(BaseMatchEvent):
    type: Literal[EventType.POSSESSION_CHANGE] = EventType.POSSESSION_CHANGE
    previous_team: str
    new_team: str


class GenericMatchEvent(BaseMatchEvent):
    type: Literal[EventType.FOUL, EventType.SUBSTITUTION]
    details: Optional[str] = None


# Discriminated union for parsing incoming streams
MatchEvent = Annotated[
    Union[
        PassEvent,
        ShotEvent,
        TackleEvent,
        PressureEvent,
        CardEvent,
        GoalEvent,
        PossessionChangeEvent,
        GenericMatchEvent,
    ],
    Field(discriminator="type"),
]