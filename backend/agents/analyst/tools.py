import json
from contextlib import contextmanager
from contextvars import ContextVar, Token
from dataclasses import dataclass
from typing import Annotated, Generator
from pydantic import Field
from engine.momentum_tracker import MomentumTracker
from engine.stats_engine import StatsEngine


@dataclass(frozen=True)
class MatchAnalysisSnapshot:
    pulse_summary: str
    player_name: str
    player_summary: str


_analysis_snapshot: ContextVar[MatchAnalysisSnapshot | None] = ContextVar(
    "analysis_snapshot", default=None
)


def capture_analysis_snapshot(
    stats: StatsEngine, momentum: MomentumTracker, player_name: str
) -> MatchAnalysisSnapshot:
    summary = stats.get_window_summary()
    summary["momentum_score"] = round(momentum.current_momentum, 2)
    summary["home_team"] = momentum.home_team
    return MatchAnalysisSnapshot(
        pulse_summary=json.dumps(summary),
        player_name=player_name,
        player_summary=json.dumps(stats.get_player_summary(player_name)),
    )


@contextmanager
def use_analysis_snapshot(
    snapshot: MatchAnalysisSnapshot,
) -> Generator[None, None, None]:
    token: Token[MatchAnalysisSnapshot | None] = _analysis_snapshot.set(snapshot)
    try:
        yield
    finally:
        _analysis_snapshot.reset(token)


def _get_analysis_snapshot() -> MatchAnalysisSnapshot:
    snapshot = _analysis_snapshot.get()
    if snapshot is None:
        raise RuntimeError("No per-moment analysis snapshot is active.")
    return snapshot


def get_pulse_momentum_window() -> str:
    """Return the immutable Pulse and momentum snapshot captured for this moment."""
    return _get_analysis_snapshot().pulse_summary


def get_player_match_stats(
    player_name: Annotated[
        str, Field(description="The name of the primary player involved in this moment")
    ]
) -> str:
    """Return the primary player's stats captured when this moment was detected."""
    snapshot = _get_analysis_snapshot()
    if player_name != snapshot.player_name:
        raise ValueError(
            f"Stats were captured for {snapshot.player_name!r}, not {player_name!r}."
        )
    return snapshot.player_summary
