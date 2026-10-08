from typing import Dict, List
from models.Event import (
    MatchEvent, EventType
)

class StatsEngine:
    def __init__(self):
        # Rolling state
        self.current_possession_team: str = None
        self.pass_count: Dict[str, int] = {}
        self.chaos_index: float = 0.0  # 0 to 100
        
        # Keeps a window of recent events to calculate rolling momentum
        self.event_window: List[MatchEvent] = []
        self.window_size_seconds = 300

    def process_event(self, event: MatchEvent) -> dict:
        """
        Ingests a single event, updates the match state, and returns 
        the current metrics (like Pulse) for the moment detector.
        """
        self.event_window.append(event)
        self._prune_old_events(event.timestamp)

        if event.type == EventType.POSSESSION_CHANGE:
            self.current_possession_team = event.new_team
        elif event.type == EventType.PASS and event.outcome == "completed":
            self.pass_count[event.team] = self.pass_count.get(event.team, 0) + 1

        return self._calculate_pulse()

    def _prune_old_events(self, current_time: float):
        """Removes events older than the 5-minute rolling window."""
        self.event_window = [ e for e in self.event_window if(current_time - e.timestamp) <= self.window_size_seconds ]

    def _calculate_pulse(self) -> dict:
        """
        Calculates Control vs. Chaos deterministically.
        Chaos increases with frequent possession changes and tackles.
        Control increases with consecutive completed passes in the window.
        """
        possession_changes = sum(1 for e in self.event_window if e.type == EventType.POSSESSION_CHANGE)
        tackles = sum(1 for e in self.event_window if e.type == EventType.TACKLE)
        
        raw_chaos = (possession_changes * 7) + (tackles * 4)
        self.chaos_index = min(100.0, float(raw_chaos))

        controlling_team_passes = sum(
            1 for e in self.event_window 
            if e.type == EventType.PASS and e.outcome == "completed" and e.team == self.current_possession_team
        )
        
        raw_control = controlling_team_passes * 5.0
        control_index = min(100.0, float(raw_control))
        
        return {
            "chaos_index": self.chaos_index,
            "control_index": control_index,
            "controlling_team": self.current_possession_team,
            "recent_events_count": len(self.event_window)
        }