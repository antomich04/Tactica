import asyncio
import random
from typing import AsyncGenerator
from engine.event_stream_interface import EventSource
from models.Event import (
    MatchEvent, EventType, PassEvent, ShotEvent, TackleEvent, CardEvent,
    GoalEvent, PossessionChangeEvent, SaveEvent, SetPieceEvent, GenericMatchEvent,
    PassOutcome, ShotOutcome, CardColor
)

class EventSimulator(EventSource):
    def __init__(self):
        # Match State
        self.match_time = 0.0  # seconds
        self.team_a = "Arsenal"
        self.team_b = "Chelsea"
        self.possession = self.team_a
        
        # Spatial State (x=0 is own goal, x=100 is opponent goal)
        self.x = 50.0
        self.y = 50.0
        self.current_player = "Odegaard"
        
        # Disciplinary State
        self.player_yellows = {}
        
        self.players = {
            self.team_a: ["Odegaard", "Saka", "Havertz", "Rice", "Saliba"],
            self.team_b: ["Palmer", "Sterling", "Enzo", "Silva", "James"]
        }

    async def stream_events(self) -> AsyncGenerator[MatchEvent, None]:
        """Runs a 6-minute procedural simulation (360 seconds)."""
        while self.match_time < 360.0:
            # Advance match time by 2 to 6 seconds per event
            time_step = random.uniform(2.0, 6.0)
            self.match_time += time_step
            await asyncio.sleep(1)  # Real-world pause for the WebSocket stream

            # Generate the next event(s) based on pitch state
            events = self._generate_next_events()
            for event in events:
                yield event

    def _generate_next_events(self) -> list[MatchEvent]:
        events = []
        base_id = f"e_{int(self.match_time * 10)}"
        
        # 1. Determine Shot Probability based on X coordinate
        # Near midfield (x=50), probability is 0.1%. Inside the box (x>85), it rises to 15-20%.
        shot_prob = 0.001 if self.x < 60 else (self.x - 60) * 0.005
        
        action_roll = random.random()

        if action_roll < shot_prob:
            # SHOT SEQUENCE
            events.extend(self._handle_shot_sequence(base_id))
        
        elif action_roll < (shot_prob + 0.15):
            # TACKLE / FOUL SEQUENCE
            events.extend(self._handle_tackle_or_foul(base_id))
            
        else:
            # PASS SEQUENCE (Default, high probability)
            events.extend(self._handle_pass(base_id))

        return events

    def _handle_pass(self, base_id: str) -> list[MatchEvent]:
        # Generate target coordinates (usually moving forward)
        end_x = min(100.0, max(0.0, self.x + random.uniform(-5.0, 25.0)))
        end_y = min(100.0, max(0.0, self.y + random.uniform(-20.0, 20.0)))
        
        is_completed = random.random() > 0.15  # 85% completion rate
        outcome = PassOutcome.COMPLETED if is_completed else PassOutcome.INTERCEPTED

        pass_event = PassEvent(
            id=base_id, match_id="m_001", timestamp=self.match_time, 
            team=self.possession, player=self.current_player,
            x=self.x, y=self.y, end_x=end_x, end_y=end_y, 
            distance=abs(end_x - self.x), outcome=outcome
        )
        
        if is_completed:
            # Move the ball and pick a new receiver
            self.x, self.y = end_x, end_y
            self.current_player = random.choice(self.players[self.possession])
            return [pass_event]
        else:
            # Intercepted: Change possession
            old_team = self.possession
            self._switch_possession()
            poss_change = PossessionChangeEvent(
                id=f"{base_id}_poss", match_id="m_001", timestamp=self.match_time + 0.5,
                team=self.possession, player=self.current_player, x=end_x, y=end_y,
                previous_team=old_team, new_team=self.possession
            )
            return [pass_event, poss_change]

    def _handle_shot_sequence(self, base_id: str) -> list[MatchEvent]:
        events = []
        is_goal = random.random() > 0.85
        outcome = ShotOutcome.GOAL if is_goal else random.choice([ShotOutcome.SAVED, ShotOutcome.OFF_TARGET])
        
        shot = ShotEvent(
            id=base_id, match_id="m_001", timestamp=self.match_time,
            team=self.possession, player=self.current_player,
            x=self.x, y=self.y, xg=random.uniform(0.05, 0.4), outcome=outcome
        )
        events.append(shot)

        if outcome == ShotOutcome.GOAL:
            events.append(GoalEvent(
                id=f"{base_id}_goal", match_id="m_001", timestamp=self.match_time + 0.5,
                team=self.possession, player=self.current_player, x=100.0, y=50.0,
                shot_event_id=shot.id, scorer=self.current_player
            ))
            self._reset_to_midfield()
        elif outcome == ShotOutcome.SAVED:
            events.append(SaveEvent(
                id=f"{base_id}_save", match_id="m_001", timestamp=self.match_time + 0.5,
                team=self._get_opposing_team(), player="Goalkeeper", x=100.0, y=50.0,
                shot_event_id=shot.id
            ))
            # 50% chance a save results in a corner
            if random.random() > 0.5:
                events.append(SetPieceEvent(
                    id=f"{base_id}_corner", match_id="m_001", timestamp=self.match_time + 3.0,
                    team=self.possession, player=random.choice(self.players[self.possession]),
                    x=100.0, y=100.0, type=EventType.CORNER
                ))
                self.x, self.y = 100.0, 100.0
            else:
                self._switch_possession()
        else:
            self._switch_possession()

        return events

    def _handle_tackle_or_foul(self, base_id: str) -> list[MatchEvent]:
        is_foul = random.random() > 0.7  # 30% of defensive actions are fouls
        opposing_team = self._get_opposing_team()
        opposing_player = random.choice(self.players[opposing_team])

        if not is_foul:
            # Clean tackle, possession changes
            tackle = TackleEvent(
                id=base_id, match_id="m_001", timestamp=self.match_time,
                team=opposing_team, player=opposing_player, x=self.x, y=self.y,
                outcome="won", opponent_player=self.current_player
            )
            self._switch_possession()
            return [tackle]
        else:
            # Foul sequence
            events = []
            events.append(GenericMatchEvent(
                id=base_id, match_id="m_001", timestamp=self.match_time,
                team=opposing_team, player=opposing_player, x=self.x, y=self.y,
                type=EventType.FOUL
            ))

            # Disciplinary action (20% of fouls result in a card)
            if random.random() > 0.8:
                current_yellows = self.player_yellows.get(opposing_player, 0)
                if current_yellows == 1:
                    # Second yellow = RED
                    events.append(CardEvent(
                        id=f"{base_id}_card", match_id="m_001", timestamp=self.match_time + 1.0,
                        team=opposing_team, player=opposing_player, x=self.x, y=self.y,
                        card_color=CardColor.RED, reason="Second Yellow"
                    ))
                    self.player_yellows[opposing_player] = 2
                else:
                    events.append(CardEvent(
                        id=f"{base_id}_card", match_id="m_001", timestamp=self.match_time + 1.0,
                        team=opposing_team, player=opposing_player, x=self.x, y=self.y,
                        card_color=CardColor.YELLOW, reason="Tactical Foul"
                    ))
                    self.player_yellows[opposing_player] = 1

            # If foul is inside the box (x > 85, y between 20 and 80), it's a penalty
            if self.x > 85.0 and 20.0 < self.y < 80.0:
                events.append(SetPieceEvent(
                    id=f"{base_id}_pen", match_id="m_001", timestamp=self.match_time + 5.0,
                    team=self.possession, player=self.current_player, x=88.5, y=50.0,
                    type=EventType.PENALTY
                ))
                self.x, self.y = 88.5, 50.0

            return events

    def _switch_possession(self):
        self.possession = self._get_opposing_team()
        self.current_player = random.choice(self.players[self.possession])
        self.x = 100.0 - self.x # Flip the pitch coordinates for the new attacking team
        self.y = 100.0 - self.y

    def _get_opposing_team(self) -> str:
        return self.team_b if self.possession == self.team_a else self.team_a

    def _reset_to_midfield(self):
        self._switch_possession()
        self.x, self.y = 50.0, 50.0