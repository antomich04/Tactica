from typing import Dict, Any, Optional
from models.Event import MatchEvent, EventType, CardColor
from models.Moment import Moment, MomentCategory


class MomentDetector:
    def __init__(self):
        self._moment_counter = 0
        self._last_chaos_alert = 0.0

    def evaluate(self, event: MatchEvent, metrics: Dict[str, Any]) -> Optional[Moment]:
        self._moment_counter += 1
        moment_id = f"mom_{self._moment_counter:04d}"

        if event.type == EventType.GOAL:
            evidence = [event.id]
            if getattr(event, "shot_event_id", None):
                evidence.append(event.shot_event_id)
            return Moment(
                id=moment_id,
                match_id=event.match_id,
                timestamp=event.timestamp,
                category=MomentCategory.GOAL,
                primary_event=event,
                evidence_event_ids=evidence,
                stats_context=metrics,
            )

        if event.type == EventType.CARD and getattr(event, "card_color", None) == CardColor.RED:
            return Moment(
                id=moment_id,
                match_id=event.match_id,
                timestamp=event.timestamp,
                category=MomentCategory.RED_CARD,
                primary_event=event,
                evidence_event_ids=[event.id],
                stats_context=metrics,
            )

        if event.type == EventType.PENALTY:
            return Moment(
                id=moment_id,
                match_id=event.match_id,
                timestamp=event.timestamp,
                category=MomentCategory.PENALTY,
                primary_event=event,
                evidence_event_ids=[event.id],
                stats_context=metrics,
            )

        if event.type == EventType.SAVE:
            diff = getattr(event, "difficulty", 0.0) or 0.0
            if diff >= 0.7:
                evidence = [event.id]
                if getattr(event, "shot_event_id", None):
                    evidence.append(event.shot_event_id)
                return Moment(
                    id=moment_id,
                    match_id=event.match_id,
                    timestamp=event.timestamp,
                    category=MomentCategory.HIGH_XG_SAVE,
                    primary_event=event,
                    evidence_event_ids=evidence,
                    stats_context=metrics,
                )

        if event.type == EventType.FOUL and event.x > 75.0:
            return Moment(
                id=moment_id,
                match_id=event.match_id,
                timestamp=event.timestamp,
                category=MomentCategory.DANGEROUS_FREE_KICK,
                primary_event=event,
                evidence_event_ids=[event.id],
                stats_context=metrics,
            )

        #Momentum-Chaos spike (throttled to once every 30s)
        chaos = metrics.get("chaos_index", 0.0)
        if chaos >= 70.0 and (event.timestamp - self._last_chaos_alert) > 30.0:
            self._last_chaos_alert = event.timestamp
            return Moment(
                id=moment_id,
                match_id=event.match_id,
                timestamp=event.timestamp,
                category=MomentCategory.MOMENTUM_SPIKE,
                primary_event=event,
                evidence_event_ids=[event.id],
                stats_context=metrics,
            )

        return None