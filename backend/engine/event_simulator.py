import asyncio
import math
import random
import uuid
from typing import AsyncGenerator, List
from engine.event_stream_interface import EventSource
from models.Event import (
    MatchEvent, EventType, PassEvent, ShotEvent, TackleEvent, CardEvent,
    GoalEvent, PossessionChangeEvent, SaveEvent, SetPieceEvent, GenericMatchEvent,
    PressureEvent, PassOutcome, ShotOutcome, CardColor
)

# Safe pitch boundaries so players never render outside touchlines
X_MIN, X_MAX = 2.0, 98.0
Y_MIN, Y_MAX = 3.0, 97.0


class EventSimulator(EventSource):
    def __init__(
        self,
        match_id: str | None = None,
        team_a_data: dict | None = None,
        team_b_data: dict | None = None,
        pause_event: asyncio.Event | None = None,
    ):
        self.match_id = match_id or f"m_{uuid.uuid4().hex[:6]}"
        self.match_time = 0.0          # 0.0 to 5400.0 (90 mins in match seconds)
        self.full_time = 5400.0        # 90 minutes
        self.half_time = 2700.0        # 45 minutes
        self._second_half_started = False
        self.real_tick_sleep = 0.45
        self._pause_event = pause_event

        self.team_a = team_a_data["name"] if team_a_data else "North London Cannons"
        self.team_b = team_b_data["name"] if team_b_data else "London Warriors"
        self.possession = self.team_a

        self.x = 50.0
        self.y = 50.0

        self.player_yellows: dict[str, int] = {}
        self.sent_off_players: set[str] = set()

        self.rosters = {
            self.team_a: self._extract_roster(team_a_data, is_home=True),
            self.team_b: self._extract_roster(team_b_data, is_home=False),
        }

        self.current_player = self.rosters[self.team_a]["MID"][0]
        self.last_passer: str | None = None

    @staticmethod
    def _extract_roster(team_data: dict | None, is_home: bool) -> dict[str, str | List[str]]:
        
        #Fallbacks to North London Cannons (Arsenal) vs London Warriors (Chelsea)
        if not team_data:
            if is_home:
                return {
                    "GK": "Davi Rayner",
                    "DEF": ["Willem Salibault", "Gabi Magallanes", "Benjamin Whyte", "Jorrien Timbers"],
                    "MID": ["Declan Ryce", "Marty Odegard", "Miko Merinos"],
                    "FWD": ["Buko Sakho", "Kaj Havertsen", "Noni Maduka"],
                }
            return {
                "GK": "Dibu Martines",
                "DEF": ["Levy Colwille", "Wes Fofanah", "Reece Jaymes", "Malou Gustoh"],
                "MID": ["Moises Caycedo", "Kyle Plammer", "Romero Lavya"],
                "FWD": ["Pedrinho Netoh", "Jao Pedra", "Estevan Willian"],
            }

        # Prefer starters from the club's tri-tier roster, falling back to all players
        starters = team_data.get("roster", {}).get("starters") or team_data.get("players") or []
        all_players = team_data.get("players") or starters

        def by_pos(pos: str) -> list[str]:
            names = [p["name"] for p in starters if p.get("position") == pos]
            if not names:
                names = [p["name"] for p in all_players if p.get("position") == pos]
            return names

        gks = by_pos("GK")
        defs = by_pos("DEF")
        mids = by_pos("MID")
        fwds = by_pos("FWD")

        return {
            "GK": gks[0] if gks else "Goalkeeper",
            "DEF": defs if defs else ["Defender"],
            "MID": mids if mids else ["Midfielder"],
            "FWD": fwds if fwds else ["Forward"],
        }

    @staticmethod
    def _clamp_x(val: float) -> float:
        return round(min(X_MAX, max(X_MIN, val)), 1)

    @staticmethod
    def _clamp_y(val: float) -> float:
        return round(min(Y_MAX, max(Y_MIN, val)), 1)

    def _attack_dir(self, team: str | None = None) -> float:
        """Returns +1.0 for Team A (attacks towards x=98) and -1.0 for Team B (attacks towards x=2)."""
        t = team or self.possession
        return 1.0 if t == self.team_a else -1.0

    def _goal_x(self, attacking_team: str | None = None) -> float:
        """Target goal X coordinate for the attacking team."""
        return X_MAX if self._attack_dir(attacking_team) > 0 else X_MIN

    def _attacking_progress(self, team: str | None = None) -> float:
        """Returns 0.0 (own goal line) to 100.0 (opponent goal line) regardless of direction."""
        return self.x if self._attack_dir(team) > 0 else (100.0 - self.x)

    def _pick_player(self, team: str, zone_progress: float | None = None, exclude: str | None = None) -> str:
        """Picks a realistic player based on pitch zone, excluding sent-off players."""
        progress = zone_progress if zone_progress is not None else self._attacking_progress(team)
        roster = self.rosters[team]

        if progress < 35.0:
            pool = roster["DEF"] * 3 + roster["MID"]
        elif progress < 68.0:
            pool = roster["MID"] * 3 + roster["DEF"] + roster["FWD"]
        else:
            pool = roster["FWD"] * 3 + roster["MID"] * 2

        available = [p for p in pool if p not in self.sent_off_players and p != exclude]
        if not available:
            all_outfield = roster["DEF"] + roster["MID"] + roster["FWD"]
            available = [p for p in all_outfield if p not in self.sent_off_players] or ["Player"]
        return random.choice(available)

    # Main stream loop
    async def stream_events(self) -> AsyncGenerator[MatchEvent, None]:
        while self.match_time < self.full_time:
            if self._pause_event is not None:
                await self._pause_event.wait()

            await asyncio.sleep(self.real_tick_sleep)

            if self._pause_event is not None:
                await self._pause_event.wait()

            time_step = random.uniform(20.0, 28.0)
            self.match_time = min(self.full_time, self.match_time + time_step)

            if not self._second_half_started and self.match_time >= self.half_time:
                self._second_half_started = True
                self.possession = self.team_b
                self.x, self.y = 50.0, 50.0
                self.current_player = self._pick_player(self.possession, 50.0)
                self.last_passer = None

            events = self._generate_next_events()
            for event in events:
                yield event

    def _generate_next_events(self) -> list[MatchEvent]:
        base_id = f"e_{int(self.match_time * 10)}"
        progress = self._attacking_progress()

        # Shot probability scales nonlinearly in the final third (progress > 68)
        if progress < 68.0:
            shot_prob = 0.005
        else:
            shot_prob = ((progress - 68.0) / 32.0) ** 1.7 * 0.38

        # Defensive action probability increases in the attacking third
        defensive_prob = 0.14 if progress < 65.0 else 0.22

        roll = random.random()
        if roll < shot_prob:
            return self._handle_shot_sequence(base_id)
        elif roll < (shot_prob + defensive_prob):
            return self._handle_defensive_sequence(base_id)
        else:
            return self._handle_pass(base_id)

    def _handle_pass(self, base_id: str) -> list[MatchEvent]:
        direction = self._attack_dir()
        progress = self._attacking_progress()

        # Forward bias in build-up; more lateral/probing passes near the box
        forward_step = random.uniform(-4.0, 22.0) if progress < 75.0 else random.uniform(-6.0, 14.0)
        lateral_step = random.uniform(-18.0, 18.0)

        # Pull ball slightly toward center when deep in the final third
        if progress > 78.0:
            lateral_step += (50.0 - self.y) * 0.25

        end_x = self._clamp_x(self.x + (direction * forward_step))
        end_y = self._clamp_y(self.y + lateral_step)

        dist_meters = round(math.hypot(end_x - self.x, end_y - self.y) * 1.05, 1)
        difficulty = round(min(0.95, max(0.1, (dist_meters / 45.0) + (0.2 if progress > 75.0 else 0.0))), 2)
        speed_kmh = round(min(95.0, max(22.0, dist_meters * random.uniform(1.8, 2.6))), 1)

        # Completion rate drops with difficulty
        completion_threshold = 0.92 - (difficulty * 0.28)
        is_completed = random.random() < completion_threshold
        outcome = PassOutcome.COMPLETED if is_completed else PassOutcome.INTERCEPTED

        receiver = self._pick_player(self.possession, exclude=self.current_player) if is_completed else None

        pass_event = PassEvent(
            id=base_id,
            match_id=self.match_id,
            timestamp=round(self.match_time, 1),
            team=self.possession,
            player=self.current_player,
            x=self.x,
            y=self.y,
            end_x=end_x,
            end_y=end_y,
            distance=dist_meters,
            speed_kmh=speed_kmh,
            difficulty_rating=difficulty,
            receiver=receiver,
            outcome=outcome,
        )

        # Moves ball to target coordinates first
        self.x, self.y = end_x, end_y

        if is_completed:
            self.last_passer = self.current_player
            self.current_player = receiver
            return [pass_event]
        else:
            old_team = self.possession
            self._switch_possession(keep_coordinates=True)
            poss_change = PossessionChangeEvent(
                id=f"{base_id}_poss",
                match_id=self.match_id,
                timestamp=round(self.match_time + 0.5, 1),
                team=self.possession,
                player=self.current_player,
                x=self.x,
                y=self.y,
                previous_team=old_team,
                new_team=self.possession,
            )
            return [pass_event, poss_change]

    def _handle_shot_sequence(self, base_id: str) -> list[MatchEvent]:
        events: list[MatchEvent] = []
        goal_x = self._goal_x(self.possession)
        opposing_team = self._get_opposing_team()
        opposing_gk = str(self.rosters[opposing_team]["GK"])

        dist_to_goal = max(4.0, math.hypot(goal_x - self.x, (50.0 - self.y) * 0.68))
        central_factor = max(0.2, 1.0 - (abs(50.0 - self.y) / 60.0))
        xg = round(min(0.65, max(0.03, (0.48 * math.exp(-dist_to_goal / 16.0)) * central_factor)), 2)
        shot_speed = round(random.uniform(78.0, 118.0), 1)

        roll = random.random()
        if roll < xg:
            outcome = ShotOutcome.GOAL
        elif roll < xg + 0.38:
            outcome = ShotOutcome.SAVED
        elif roll < xg + 0.52:
            outcome = ShotOutcome.BLOCKED
        else:
            outcome = ShotOutcome.OFF_TARGET

        shot = ShotEvent(
            id=base_id,
            match_id=self.match_id,
            timestamp=round(self.match_time, 1),
            team=self.possession,
            player=self.current_player,
            x=self.x,
            y=self.y,
            xg=xg,
            speed_kmh=shot_speed,
            distance=round(dist_to_goal, 1),
            outcome=outcome,
        )
        events.append(shot)

        if outcome == ShotOutcome.GOAL:
            events.append(GoalEvent(
                id=f"{base_id}_goal",
                match_id=self.match_id,
                timestamp=round(self.match_time + 0.5, 1),
                team=self.possession,
                player=self.current_player,
                x=goal_x,
                y=50.0,
                shot_event_id=shot.id,
                scorer=self.current_player,
                assist_player=self.last_passer if self.last_passer != self.current_player else None,
            ))
            self._reset_to_midfield()

        elif outcome == ShotOutcome.SAVED:
            save_diff = round(min(0.95, max(0.35, xg + random.uniform(0.15, 0.45))), 2)
            events.append(SaveEvent(
                id=f"{base_id}_save",
                match_id=self.match_id,
                timestamp=round(self.match_time + 0.5, 1),
                team=opposing_team,
                player=opposing_gk,
                x=goal_x,
                y=50.0,
                shot_event_id=shot.id,
                difficulty=save_diff,
            ))
            if random.random() < 0.45:
                corner_y = Y_MIN if self.y < 50.0 else Y_MAX
                taker = self._pick_player(self.possession, 85.0)
                events.append(SetPieceEvent(
                    id=f"{base_id}_corner",
                    match_id=self.match_id,
                    timestamp=round(self.match_time + 3.0, 1),
                    team=self.possession,
                    player=taker,
                    taker=taker,
                    x=goal_x,
                    y=corner_y,
                    type=EventType.CORNER,
                ))
                self.x = self._clamp_x(goal_x - (self._attack_dir() * 8.0))
                self.y = self._clamp_y(50.0 + random.uniform(-12.0, 12.0))
                self.current_player = self._pick_player(self.possession, 90.0, exclude=taker)
                self.last_passer = taker
            else:
                # Keeper claims the ball and starts build-up near their own box
                self.x = self._clamp_x(goal_x - (self._attack_dir() * 10.0))
                self.y = 50.0
                self._switch_possession(keep_coordinates=True)
        else:
            # Goal kick / turnover near defensive third
            self.x = self._clamp_x(goal_x - (self._attack_dir() * 12.0))
            self.y = 50.0
            self._switch_possession(keep_coordinates=True)

        return events

    def _handle_defensive_sequence(self, base_id: str) -> list[MatchEvent]:
        events: list[MatchEvent] = []
        opposing_team = self._get_opposing_team()
        progress = self._attacking_progress()
        opposing_player = self._pick_player(opposing_team, 100.0 - progress)

        # Emits a PressureEvent before the duel 50% of the time
        if random.random() < 0.50:
            events.append(PressureEvent(
                id=f"{base_id}_press",
                match_id=self.match_id,
                timestamp=round(self.match_time - 0.4, 1),
                team=opposing_team,
                player=opposing_player,
                x=self.x,
                y=self.y,
                duration=round(random.uniform(1.2, 3.8), 1),
                opponent_player=self.current_player,
            ))

        is_foul = random.random() < 0.28  # 28% of duels result in a foul
        if not is_foul:
            tackle = TackleEvent(
                id=base_id,
                match_id=self.match_id,
                timestamp=round(self.match_time, 1),
                team=opposing_team,
                player=opposing_player,
                x=self.x,
                y=self.y,
                outcome="won",
                opponent_player=self.current_player,
            )
            old_team = self.possession
            self._switch_possession(keep_coordinates=True)
            self.current_player = opposing_player
            poss = PossessionChangeEvent(
                id=f"{base_id}_poss",
                match_id=self.match_id,
                timestamp=round(self.match_time + 0.3, 1),
                team=self.possession,
                player=opposing_player,
                x=self.x,
                y=self.y,
                previous_team=old_team,
                new_team=self.possession,
            )
            events.extend([tackle, poss])
            return events

        # Foul committed by defending team
        events.append(GenericMatchEvent(
            id=base_id,
            match_id=self.match_id,
            timestamp=round(self.match_time, 1),
            team=opposing_team,
            player=opposing_player,
            x=self.x,
            y=self.y,
            type=EventType.FOUL,
            details=f"Foul by {opposing_player} on {self.current_player}",
        ))

        # Card check (18% of fouls)
        if random.random() < 0.18:
            current_yellows = self.player_yellows.get(opposing_player, 0)
            if current_yellows == 1:
                events.append(CardEvent(
                    id=f"{base_id}_card",
                    match_id=self.match_id,
                    timestamp=round(self.match_time + 1.0, 1),
                    team=opposing_team,
                    player=opposing_player,
                    x=self.x,
                    y=self.y,
                    card_color=CardColor.RED,
                    reason="Second Yellow",
                ))
                self.player_yellows[opposing_player] = 2
                self.sent_off_players.add(opposing_player)
            else:
                events.append(CardEvent(
                    id=f"{base_id}_card",
                    match_id=self.match_id,
                    timestamp=round(self.match_time + 1.0, 1),
                    team=opposing_team,
                    player=opposing_player,
                    x=self.x,
                    y=self.y,
                    card_color=CardColor.YELLOW,
                    reason="Tactical Foul",
                ))
                self.player_yellows[opposing_player] = 1

        # Penalty check: inside opponent's penalty box (progress > 84 and central y)
        if progress > 84.0 and 22.0 < self.y < 78.0:
            pen_x = 88.5 if self._attack_dir() > 0 else 11.5
            goal_x = self._goal_x(self.possession)
            self.x, self.y = pen_x, 50.0

            events.append(SetPieceEvent(
                id=f"{base_id}_pen",
                match_id=self.match_id,
                timestamp=round(self.match_time + 4.0, 1),
                team=self.possession,
                player=self.current_player,
                taker=self.current_player,
                x=pen_x,
                y=50.0,
                type=EventType.PENALTY,
            ))

            is_pen_goal = random.random() < 0.78
            outcome = ShotOutcome.GOAL if is_pen_goal else ShotOutcome.SAVED
            pen_shot = ShotEvent(
                id=f"{base_id}_pen_shot",
                match_id=self.match_id,
                timestamp=round(self.match_time + 5.0, 1),
                team=self.possession,
                player=self.current_player,
                x=pen_x,
                y=50.0,
                xg=0.79,
                speed_kmh=round(random.uniform(92.0, 115.0), 1),
                distance=11.0,
                outcome=outcome,
            )
            events.append(pen_shot)

            if is_pen_goal:
                events.append(GoalEvent(
                    id=f"{base_id}_pen_goal",
                    match_id=self.match_id,
                    timestamp=round(self.match_time + 5.5, 1),
                    team=self.possession,
                    player=self.current_player,
                    x=goal_x,
                    y=50.0,
                    shot_event_id=pen_shot.id,
                    scorer=self.current_player,
                ))
                self._reset_to_midfield()
            else:
                events.append(SaveEvent(
                    id=f"{base_id}_pen_save",
                    match_id=self.match_id,
                    timestamp=round(self.match_time + 5.5, 1),
                    team=opposing_team,
                    player=str(self.rosters[opposing_team]["GK"]),
                    x=goal_x,
                    y=50.0,
                    shot_event_id=pen_shot.id,
                    difficulty=0.85,
                ))
                self._switch_possession(keep_coordinates=True)

        elif progress > 72.0 and random.random() < 0.65:
            # Dangerous free-kick shot
            events.extend(self._handle_shot_sequence(f"{base_id}_fk_shot"))

        return events

    def _switch_possession(self, keep_coordinates: bool = True):
        """Switches possession without flipping absolute pitch coordinates."""
        self.possession = self._get_opposing_team()
        self.last_passer = None
        if not keep_coordinates:
            self.x, self.y = 50.0, 50.0
        self.current_player = self._pick_player(self.possession)

    def _get_opposing_team(self) -> str:
        return self.team_b if self.possession == self.team_a else self.team_a

    def _reset_to_midfield(self):
        self._switch_possession(keep_coordinates=False)
        self.x, self.y = 50.0, 50.0