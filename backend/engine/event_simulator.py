import asyncio
import random
import uuid
from typing import AsyncGenerator
from engine.event_stream_interface import EventSource
from models.Event import (
    MatchEvent, EventType, PassEvent, ShotEvent, TackleEvent, CardEvent,
    GoalEvent, PossessionChangeEvent, SaveEvent, SetPieceEvent, GenericMatchEvent,
    PassOutcome, ShotOutcome, CardColor
)

class EventSimulator(EventSource):
    def __init__(self, match_id: str = None):
        self.match_id = match_id or f"m_{uuid.uuid4().hex[:6]}"
        self.match_time = 0.0  # Simulated match time in seconds.
        self.team_a = "Arsenal"
        self.team_b = "Chelsea"
        self.possession = self.team_a
        
        self.x = 50.0
        self.y = 50.0
        self.current_player = "Odegaard"
        
        self.player_yellows = {}
        
        self.players = {
            self.team_a: ["Odegaard", "Saka", "Havertz", "Rice", "Saliba"],
            self.team_b: ["Palmer", "Sterling", "Enzo", "Silva", "James"]
        }

    async def stream_events(self) -> AsyncGenerator[MatchEvent, None]:
        while self.match_time < 360.0:
            # Advance simulated time by 3-8 seconds before each event sequence.
            time_step = random.uniform(3.0, 8.0)
            self.match_time += time_step
            await asyncio.sleep(1)

            events = self._generate_next_events()
            for event in events:
                yield event

    def _generate_next_events(self) -> list[MatchEvent]:
        events = []
        base_id = f"e_{int(self.match_time * 10)}"
        
        shot_prob = 0.001 if self.x < 60 else (self.x - 60) * 0.005
        
        action_roll = random.random()

        if action_roll < shot_prob:
            events.extend(self._handle_shot_sequence(base_id))
        elif action_roll < (shot_prob + 0.15):
            events.extend(self._handle_tackle_or_foul(base_id))
        else:
            events.extend(self._handle_pass(base_id))

        return events

    def _handle_pass(self, base_id: str) -> list[MatchEvent]:
        # Passes generally move the ball toward the opponent's goal.
        end_x = min(94.0, max(6.0, self.x + random.uniform(-8.0, 22.0)))
        end_y = min(92.0, max(8.0, self.y + random.uniform(-18.0, 18.0)))
        
        is_completed = random.random() > 0.12  # 88% completion rate
        outcome = PassOutcome.COMPLETED if is_completed else PassOutcome.INTERCEPTED

        pass_event = PassEvent(
            id=base_id, match_id=self.match_id, timestamp=self.match_time, 
            team=self.possession, player=self.current_player,
            x=self.x, y=self.y, end_x=end_x, end_y=end_y, 
            distance=abs(end_x - self.x), outcome=outcome
        )
        
        if is_completed:
            self.x, self.y = end_x, end_y
            self.current_player = random.choice(self.players[self.possession])
            return [pass_event]
        else:
            old_team = self.possession
            self._switch_possession()
            poss_change = PossessionChangeEvent(
                id=f"{base_id}_poss", match_id=self.match_id, timestamp=self.match_time + 0.5,
                team=self.possession, player=self.current_player, x=end_x, y=end_y,
                previous_team=old_team, new_team=self.possession
            )
            return [pass_event, poss_change]

    def _handle_shot_sequence(self, base_id: str) -> list[MatchEvent]:
        events = []
        is_goal = random.random() > 0.85
        outcome = ShotOutcome.GOAL if is_goal else random.choice([ShotOutcome.SAVED, ShotOutcome.OFF_TARGET])
        
        shot = ShotEvent(
            id=base_id, match_id=self.match_id, timestamp=self.match_time,
            team=self.possession, player=self.current_player,
            x=self.x, y=self.y, xg=random.uniform(0.05, 0.4), outcome=outcome
        )
        events.append(shot)

        if outcome == ShotOutcome.GOAL:
            events.append(GoalEvent(
                id=f"{base_id}_goal", match_id=self.match_id, timestamp=self.match_time + 0.5,
                team=self.possession, player=self.current_player, x=100.0, y=50.0,
                shot_event_id=shot.id, scorer=self.current_player
            ))
            self._reset_to_midfield()
        elif outcome == ShotOutcome.SAVED:
            events.append(SaveEvent(
                id=f"{base_id}_save", match_id=self.match_id, timestamp=self.match_time + 0.5,
                team=self._get_opposing_team(), player="Goalkeeper", x=100.0, y=50.0,
                shot_event_id=shot.id, difficulty=random.uniform(0.4, 0.9)
            ))
            if random.random() > 0.5:
                events.append(SetPieceEvent(
                    id=f"{base_id}_corner", match_id=self.match_id, timestamp=self.match_time + 3.0,
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
            tackle = TackleEvent(
                id=base_id, match_id=self.match_id, timestamp=self.match_time,
                team=opposing_team, player=opposing_player, x=self.x, y=self.y,
                outcome="won", opponent_player=self.current_player
            )
            self._switch_possession()
            return [tackle]
        else:
            events = []
            events.append(GenericMatchEvent(
                id=base_id, match_id=self.match_id, timestamp=self.match_time,
                team=opposing_team, player=opposing_player, x=self.x, y=self.y,
                type=EventType.FOUL
            ))

            if random.random() > 0.8:
                current_yellows = self.player_yellows.get(opposing_player, 0)
                if current_yellows == 1:
                    events.append(CardEvent(
                        id=f"{base_id}_card", match_id=self.match_id, timestamp=self.match_time + 1.0,
                        team=opposing_team, player=opposing_player, x=self.x, y=self.y,
                        card_color=CardColor.RED, reason="Second Yellow"
                    ))
                    self.player_yellows[opposing_player] = 2
                else:
                    events.append(CardEvent(
                        id=f"{base_id}_card", match_id=self.match_id, timestamp=self.match_time + 1.0,
                        team=opposing_team, player=opposing_player, x=self.x, y=self.y,
                        card_color=CardColor.YELLOW, reason="Tactical Foul"
                    ))
                    self.player_yellows[opposing_player] = 1

            # Fouls in the penalty area lead to a penalty, which is usually converted.
            if self.x > 85.0 and 20.0 < self.y < 80.0:
                events.append(SetPieceEvent(
                    id=f"{base_id}_pen", match_id=self.match_id, timestamp=self.match_time + 5.0,
                    team=self.possession, player=self.current_player, x=88.5, y=50.0,
                    type=EventType.PENALTY
                ))
                self.x, self.y = 88.5, 50.0
                
                is_pen_goal = random.random() < 0.70
                outcome = ShotOutcome.GOAL if is_pen_goal else ShotOutcome.SAVED
                
                pen_shot = ShotEvent(
                    id=f"{base_id}_pen_shot", match_id=self.match_id, timestamp=self.match_time + 6.0,
                    team=self.possession, player=self.current_player, x=88.5, y=50.0,
                    xg=0.79, outcome=outcome
                )
                events.append(pen_shot)
                
                if is_pen_goal:
                    events.append(GoalEvent(
                        id=f"{base_id}_pen_goal", match_id=self.match_id, timestamp=self.match_time + 6.5,
                        team=self.possession, player=self.current_player, x=100.0, y=50.0,
                        shot_event_id=pen_shot.id, scorer=self.current_player
                    ))
                    self._reset_to_midfield()
                else:
                    events.append(SaveEvent(
                        id=f"{base_id}_pen_save", match_id=self.match_id, timestamp=self.match_time + 6.5,
                        team=opposing_team, player="Goalkeeper", x=100.0, y=50.0,
                        shot_event_id=pen_shot.id, difficulty=0.85
                    ))
                    self._switch_possession()
            # Advanced-position fouls may lead to a quick shot.
            elif self.x > 70.0:
                if random.random() < 0.80:
                    events.extend(self._handle_shot_sequence(f"{base_id}_fk_shot"))

            return events

    def _switch_possession(self):
        self.possession = self._get_opposing_team()
        self.current_player = random.choice(self.players[self.possession])
        # Reorient the pitch so the new attacking team moves toward x=100.
        self.x = 100.0 - self.x 
        self.y = 100.0 - self.y

    def _get_opposing_team(self) -> str:
        return self.team_b if self.possession == self.team_a else self.team_a

    def _reset_to_midfield(self):
        self._switch_possession()
        self.x, self.y = 50.0, 50.0