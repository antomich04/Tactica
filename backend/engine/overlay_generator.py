from models.Moment import Moment, MomentCategory
from models.Overlays import Overlay, OverlayType, PersonaType


def moment_to_fast_overlay(moment: Moment) -> Overlay:
    ev = moment.primary_event

    if moment.category == MomentCategory.GOAL:
        scorer = getattr(ev, "scorer", ev.player)
        return Overlay(
            id=f"ov_{moment.id}",
            match_id=moment.match_id,
            timestamp=moment.timestamp,
            duration=6.0,
            type=OverlayType.GOAL,
            priority=1,
            language="en",
            persona=PersonaType.CASUAL,
            text=f"GOAL! {scorer} scores for {ev.team}!",
            evidence_event_ids=moment.evidence_event_ids,
            verified=True,
            meta={"team": ev.team, "player": scorer},
        )

    if moment.category == MomentCategory.RED_CARD:
        return Overlay(
            id=f"ov_{moment.id}",
            match_id=moment.match_id,
            timestamp=moment.timestamp,
            duration=6.0,
            type=OverlayType.CARD,
            priority=1,
            language="en",
            persona=PersonaType.CASUAL,
            text=f"RED CARD! {ev.player} ({ev.team}) is sent off!",
            evidence_event_ids=moment.evidence_event_ids,
            verified=True,
            meta={"team": ev.team, "player": ev.player},
        )

    if moment.category == MomentCategory.PENALTY:
        return Overlay(
            id=f"ov_{moment.id}",
            match_id=moment.match_id,
            timestamp=moment.timestamp,
            duration=5.0,
            type=OverlayType.MILESTONE,
            priority=2,
            language="en",
            persona=PersonaType.CASUAL,
            text=f"PENALTY AWARDED to {ev.team}!",
            evidence_event_ids=moment.evidence_event_ids,
            verified=True,
            meta={"team": ev.team},
        )

    if moment.category == MomentCategory.MOMENTUM_SPIKE:
        chaos = moment.stats_context.get("chaos_index", 0.0)
        return Overlay(
            id=f"ov_{moment.id}",
            match_id=moment.match_id,
            timestamp=moment.timestamp,
            duration=5.0,
            type=OverlayType.MOMENTUM_SHIFT,
            priority=3,
            language="en",
            persona=PersonaType.ANALYST,
            text=f"Tactical swing: Game chaos reached {chaos:.0f}%. High turnover rate.",
            evidence_event_ids=moment.evidence_event_ids,
            verified=True,
            meta=moment.stats_context,
        )

    # Fallback for remaining moments
    return Overlay(
        id=f"ov_{moment.id}",
        match_id=moment.match_id,
        timestamp=moment.timestamp,
        duration=4.0,
        type=OverlayType.MOMENTUM_SHIFT,
        priority=4,
        language="en",
        persona=PersonaType.CASUAL,
        text=f"Key action: {moment.category.value.replace('_', ' ').title()} by {ev.player}.",
        evidence_event_ids=moment.evidence_event_ids,
        verified=True,
        meta={"x": ev.x, "y": ev.y},
    )