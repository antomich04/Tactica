from typing import Dict, Any, Optional
from models.Event import MatchEvent, EventType, CardColor
from models.Moment import Moment, MomentCategory

class MomentDetector:
    def __init__(self):
        self._moment_counter = 0
        self._last_chaos_alert = -999.0
        self._last_minor_moment_time = -999.0

    def _next_id(self) -> str:
        self._moment_counter += 1
        return f"mom_{self._moment_counter:04d}"

    def evaluate(self, event: MatchEvent, metrics: Dict[str, Any]) -> Optional[Moment]:
        # Tier 1: Unthrottled Major Match Event - GOALS, RED CARDS, PENALTIES
        if event.type == EventType.GOAL:
            evidence = [event.id]
            if getattr(event, "shot_event_id", None):
                evidence.append(event.shot_event_id)
            return Moment(
                id=self._next_id(),
                match_id=event.match_id,
                timestamp=event.timestamp,
                category=MomentCategory.GOAL,
                primary_event=event,
                evidence_event_ids=evidence,
                stats_context=metrics,
            )

        if event.type == EventType.CARD and getattr(event, "card_color", None) == CardColor.RED:
            return Moment(
                id=self._next_id(),
                match_id=event.match_id,
                timestamp=event.timestamp,
                category=MomentCategory.RED_CARD,
                primary_event=event,
                evidence_event_ids=[event.id],
                stats_context=metrics,
            )

        if event.type == EventType.PENALTY:
            return Moment(
                id=self._next_id(),
                match_id=event.match_id,
                timestamp=event.timestamp,
                category=MomentCategory.PENALTY,
                primary_event=event,
                evidence_event_ids=[event.id],
                stats_context=metrics,
            )

        # Tier 2: Throttled Tactical Moments - min 210 match-seconds / ~8.5 real seconds apart
        if (event.timestamp - self._last_minor_moment_time) < 210.0:
            return None

        if event.type == EventType.SAVE:
            diff = getattr(event, "difficulty", 0.0) or 0.0
            if diff >= 0.72:  # Only important saves trigger a moment
                self._last_minor_moment_time = event.timestamp
                evidence = [event.id]
                if getattr(event, "shot_event_id", None):
                    evidence.append(event.shot_event_id)
                return Moment(
                    id=self._next_id(),
                    match_id=event.match_id,
                    timestamp=event.timestamp,
                    category=MomentCategory.HIGH_XG_SAVE,
                    primary_event=event,
                    evidence_event_ids=evidence,
                    stats_context=metrics,
                )

        if event.type == EventType.FOUL and (event.x > 78.0 or event.x < 22.0):
            self._last_minor_moment_time = event.timestamp
            return Moment(
                id=self._next_id(),
                match_id=event.match_id,
                timestamp=event.timestamp,
                category=MomentCategory.DANGEROUS_FREE_KICK,
                primary_event=event,
                evidence_event_ids=[event.id],
                stats_context=metrics,
            )

        # Tier 3: Momentum-Chaos spike, max once every 480 match-seconds / ~8 match mins
        chaos = metrics.get("chaos_index", 0.0)
        if chaos >= 72.0 and (event.timestamp - self._last_chaos_alert) > 480.0:
            self._last_chaos_alert = event.timestamp
            self._last_minor_moment_time = event.timestamp
            return Moment(
                id=self._next_id(),
                match_id=event.match_id,
                timestamp=event.timestamp,
                category=MomentCategory.MOMENTUM_SPIKE,
                primary_event=event,
                evidence_event_ids=[event.id],
                stats_context=metrics,
            )

        return None