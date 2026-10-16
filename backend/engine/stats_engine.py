from typing import Dict, List
from models.Event import MatchEvent, EventType, PassOutcome

class StatsEngine:
    def __init__(self):
        self.current_possession_team: str | None = None
        self.home_team: str = "Arsenal"
        self.away_team: str = "Chelsea"
        self.pass_count: Dict[str, int] = {}
        self.chaos_index: float = 0.0  # 0 to 100

        # Rolling 5-minute match-time window (300 match seconds)
        self.event_window: List[MatchEvent] = []
        self.window_size_seconds = 300.0

    def process_event(self, event: MatchEvent) -> dict:
        """
        Ingests a single event, updates the match state, and returns
        the current Pulse metrics for the moment detector and UI.
        """
        self.event_window.append(event)
        self._prune_old_events(event.timestamp)

        if self.current_possession_team is None and hasattr(event, "team"):
            self.current_possession_team = event.team

        if event.type == EventType.POSSESSION_CHANGE:
            self.current_possession_team = event.new_team
        elif event.type == EventType.PASS and getattr(event, "outcome", None) == PassOutcome.COMPLETED:
            self.pass_count[event.team] = self.pass_count.get(event.team, 0) + 1

        return self._calculate_pulse()

    def _prune_old_events(self, current_time: float):
        """Removes events older than the 5-minute rolling window."""
        self.event_window = [
            e for e in self.event_window if (current_time - e.timestamp) <= self.window_size_seconds
        ]

    def _is_in_opponent_half(self, e: MatchEvent) -> bool:
        """Checks territorial dominance using absolute pitch coordinates."""
        return e.x > 50.0 if e.team == self.home_team else e.x < 50.0

    def _is_in_final_third(self, e: MatchEvent) -> bool:
        return e.x > 67.0 if e.team == self.home_team else e.x < 33.0

    def _team_control_score(self, team: str, total_passes: int) -> float:
        """Computes a transparent 0-100 Control score for a specific team."""
        team_passes = [e for e in self.event_window if e.type == EventType.PASS and e.team == team]
        if not team_passes:
            return 0.0

        completed = [e for e in team_passes if getattr(e, "outcome", None) == PassOutcome.COMPLETED]
        opp_half_events = [
            e for e in self.event_window if getattr(e, "team", None) == team and self._is_in_opponent_half(e)
        ]
        final_third_events = [
            e for e in self.event_window if getattr(e, "team", None) == team and self._is_in_final_third(e)
        ]

        #Possession share in window (0-35 pts)
        poss_share = (len(team_passes) / max(1, total_passes)) * 35.0
        #Pass accuracy in window (0-25 pts)
        accuracy = (len(completed) / len(team_passes)) * 25.0
        #Territory in opponent half (0-25 pts)
        team_total = max(1, sum(1 for e in self.event_window if getattr(e, "team", None) == team))
        territory = (len(opp_half_events) / team_total) * 25.0
        #Final-third penetration (0-15 pts)
        penetration = min(15.0, len(final_third_events) * 3.0)

        return round(min(100.0, poss_share + accuracy + territory + penetration), 1)

    def _calculate_pulse(self) -> dict:
        """
        Calculates deterministic Control vs. Chaos over the rolling window.
        """
        n_events = len(self.event_window)
        if n_events == 0:
            return {
                "chaos_index": 0.0,
                "control_index": 50.0,
                "home_control": 50.0,
                "away_control": 50.0,
                "controlling_team": self.current_possession_team,
                "recent_events_count": 0,
            }

        turnovers = sum(1 for e in self.event_window if e.type == EventType.POSSESSION_CHANGE)
        tackles = sum(1 for e in self.event_window if e.type == EventType.TACKLE)
        pressures = sum(1 for e in self.event_window if e.type == EventType.PRESSURE)
        fouls_cards = sum(1 for e in self.event_window if e.type in (EventType.FOUL, EventType.CARD))

        # Rate-based chaos so it scales smoothly across any tick density
        weighted_disruptions = (turnovers * 3.2) + (tackles * 2.0) + (pressures * 1.5) + (fouls_cards * 3.5)
        normalizer = max(8.0, n_events * 0.85)
        self.chaos_index = round(min(100.0, (weighted_disruptions / normalizer) * 100.0), 1)

        total_passes = sum(1 for e in self.event_window if e.type == EventType.PASS)
        home_ctrl = self._team_control_score(self.home_team, total_passes)
        away_ctrl = self._team_control_score(self.away_team, total_passes)

        if home_ctrl >= away_ctrl:
            controlling_team = self.home_team
            control_index = home_ctrl
        else:
            controlling_team = self.away_team
            control_index = away_ctrl

        return {
            "chaos_index": self.chaos_index,
            "control_index": control_index,
            "home_control": home_ctrl,
            "away_control": away_ctrl,
            "controlling_team": controlling_team,
            "recent_events_count": n_events,
        }

    def get_window_summary(self) -> dict:
        """Used by the Tactical Analyst tool to get window stats + evidence IDs."""
        pulse = self._calculate_pulse()
        recent_ids = [e.id for e in self.event_window[-8:]]
        return {
            **pulse,
            "pass_counts": self.pass_count,
            "evidence_event_ids": recent_ids,
        }

    def get_player_summary(self, player_name: str) -> dict:
        """Aggregates stats for a player from the rolling event window."""
        player_events = [e for e in self.event_window if getattr(e, "player", None) == player_name]
        passes = [e for e in player_events if e.type == EventType.PASS]
        completed = [e for e in passes if getattr(e, "outcome", None) == PassOutcome.COMPLETED]
        shots = [e for e in player_events if e.type == EventType.SHOT]
        tackles = [e for e in player_events if e.type == EventType.TACKLE]

        return {
            "player": player_name,
            "events_in_window": len(player_events),
            "passes_completed": len(completed),
            "passes_attempted": len(passes),
            "shots": len(shots),
            "tackles": len(tackles),
            "evidence_event_ids": [e.id for e in player_events[-5:]],
        }