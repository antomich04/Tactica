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
SUBBED_ON_PROTECTION_SECONDS = 900.0


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
        self.is_halftime_pause = False

        # Human-readable pacing: 1.5s between ticks, 0.55s between chained events
        self.real_tick_sleep = 0.5
        self.sequence_step_sleep = 0.25
        self._pause_event = pause_event

        self.team_a = team_a_data["name"] if team_a_data else "North London Cannons"
        self.team_b = team_b_data["name"] if team_b_data else "London Warriors"
        self.possession = self.team_a

        self.x = 50.0
        self.y = 50.0

        self.player_yellows: dict[str, int] = {}
        self.sent_off_players: set[str] = set()
        self.subbed_on_at: dict[str, float] = {}

        # Schedule each team's substitutions across the second half.
        self.subs_made: dict[str, int] = {self.team_a: 0, self.team_b: 0}
        self.max_subs_per_team = 5
        self.substitution_targets = {
            team: random.randint(3, self.max_subs_per_team)
            for team in (self.team_a, self.team_b)
        }
        substitution_window = 5160.0 - 3300.0
        self._substitution_schedule = {
            team: [
                3300.0
                + (index + 1)
                * substitution_window
                / (self.substitution_targets[team] + 1)
                for index in range(self.substitution_targets[team])
            ]
            for team in (self.team_a, self.team_b)
        }

        self.rosters = {
            self.team_a: self._extract_roster(team_a_data, is_home=True),
            self.team_b: self._extract_roster(team_b_data, is_home=False),
        }

        self.current_player = self.rosters[self.team_a]["MID"][0]
        self.last_passer: str | None = None

    @staticmethod
    def _extract_roster(team_data: dict | None, is_home: bool) -> dict:
        if not team_data:
            if is_home:
                return {
                    "GK": "Davi Rayner",
                    "DEF": ["Willem Salibault", "Gabi Magallanes", "Benjamin Whyte", "Jorrien Timbers"],
                    "MID": ["Declan Ryce", "Marty Odegard", "Miko Merinos"],
                    "FWD": ["Buko Sakho", "Kaj Havertsen", "Noni Maduka"],
                    "BENCH": {
                        "DEF": ["Rico Calafiore", "Ezra Konsah"],
                        "MID": ["Marti Zubimendy", "Etan Nwanery"],
                        "FWD": ["Viktor Keres", "Christos Zolis"],
                    },
                }
            return {
                "GK": "Dibu Martines",
                "DEF": ["Levy Colwille", "Wes Fofanah", "Reece Jaymes", "Malou Gustoh"],
                "MID": ["Moises Caycedo", "Kyle Plammer", "Romero Lavya"],
                "FWD": ["Pedrinho Netoh", "Jao Pedra", "Estevan Willian"],
                "BENCH": {
                    "DEF": ["Jorrell Hatoh", "Valentin Barko"],
                    "MID": ["Morgann Rodger", "Jordy Hendersen"],
                    "FWD": ["Jamey Gitten", "Danilo Welbek"],
                },
            }

        starters = team_data.get("roster", {}).get("starters") or team_data.get("players") or []
        roster_data = team_data.get("roster", {})
        substitutes = roster_data.get("substitutes") or []
        substitutes = [*substitutes, *(roster_data.get("reserves") or [])]
        all_players = team_data.get("players") or starters

        def by_pos(source: list[dict], pos: str) -> list[str]:
            return [p["name"] for p in source if p.get("position") == pos]

        gks = by_pos(starters, "GK") or by_pos(all_players, "GK")
        defs = by_pos(starters, "DEF") or by_pos(all_players, "DEF")[:4]
        mids = by_pos(starters, "MID") or by_pos(all_players, "MID")[:3]
        fwds = by_pos(starters, "FWD") or by_pos(all_players, "FWD")[:3]

        bench_defs = by_pos(substitutes, "DEF")
        bench_mids = by_pos(substitutes, "MID")
        bench_fwds = by_pos(substitutes, "FWD")

        return {
            "GK": gks[0] if gks else "Goalkeeper",
            "DEF": list(defs) if defs else ["Defender"],
            "MID": list(mids) if mids else ["Midfielder"],
            "FWD": list(fwds) if fwds else ["Forward"],
            "BENCH": {
                "DEF": list(bench_defs),
                "MID": list(bench_mids),
                "FWD": list(bench_fwds),
            },
        }

    @staticmethod
    def _clamp_x(val: float) -> float:
        return round(min(X_MAX, max(X_MIN, val)), 1)

    @staticmethod
    def _clamp_y(val: float) -> float:
        return round(min(Y_MAX, max(Y_MIN, val)), 1)

    def _attack_dir(self, team: str | None = None) -> float:
        t = team or self.possession
        return 1.0 if t == self.team_a else -1.0

    def _goal_x(self, attacking_team: str | None = None) -> float:
        return X_MAX if self._attack_dir(attacking_team) > 0 else X_MIN

    def _attacking_progress(self, team: str | None = None) -> float:
        return self.x if self._attack_dir(team) > 0 else (100.0 - self.x)

    def _pick_player(self, team: str, zone_progress: float | None = None, exclude: str | None = None) -> str:
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

    async def stream_events(self) -> AsyncGenerator[MatchEvent, None]:
        while self.match_time < self.full_time:
            if self._pause_event is not None:
                await self._pause_event.wait()

            await asyncio.sleep(self.real_tick_sleep)

            if self._pause_event is not None:
                await self._pause_event.wait()

            time_step = random.uniform(35.0, 65.0)
            next_time = self.match_time + time_step

            # Check if we are crossing Halftime (2700.0s / 45:00)
            if not self._second_half_started and next_time >= self.half_time:
                self.match_time = self.half_time
                self._second_half_started = True
                self.is_halftime_pause = True

                # Emit final event at 45:00 so the scoreboard clock lands on 45:00
                ht_events = self._handle_pass(f"e_{int(self.match_time * 10)}")
                for ev in ht_events:
                    yield ev

                # Reset to center circle for 2nd-half kickoff
                self.possession = self.team_b
                self.x, self.y = 50.0, 50.0
                self.current_player = self._pick_player(self.possession, 50.0)
                self.last_passer = None

                # Pause match at halftime until resumed via broadcaster / match router
                if self._pause_event is not None:
                    self._pause_event.clear()
                    await self._pause_event.wait()
                self.is_halftime_pause = False
                continue

            self.match_time = min(self.full_time, next_time)
            events = self._generate_next_events()

            for idx, event in enumerate(events):
                if idx > 0:
                    if self._pause_event is not None:
                        await self._pause_event.wait()
                    await asyncio.sleep(self.sequence_step_sleep)
                yield event
                event_type = getattr(event.type, "value", event.type)
                event_delay = {
                    EventType.FOUL: 1.0,
                    EventType.SUBSTITUTION: 1.2,
                    EventType.PENALTY: 1.6,
                }.get(event_type, 0.0)
                if isinstance(event, ShotEvent) and "_pen_shot" in event.id:
                    event_delay = 0.7
                if event_delay:
                    if self._pause_event is not None:
                        await self._pause_event.wait()
                    await asyncio.sleep(event_delay)

    def _maybe_make_substitution(self, base_id: str) -> GenericMatchEvent | None:
        """Make each team's scheduled substitutions between 55' and 86'."""
        if self.match_time < 3300.0 or self.match_time > 5160.0:
            return None

        candidate_teams = [
            team
            for team in (self.team_a, self.team_b)
            if self.subs_made[team] < self.substitution_targets[team]
            and self.match_time
            >= self._substitution_schedule[team][self.subs_made[team]]
        ]
        if not candidate_teams:
            return None

        sub_team = random.choice(candidate_teams)
        roster = self.rosters[sub_team]
        bench = roster.get("BENCH", {})

        available_positions = [
            pos for pos in ("FWD", "MID", "DEF")
            if bench.get(pos)
            and len([
                player
                for player in roster[pos]
                if player not in self.sent_off_players
                and self.match_time - self.subbed_on_at.get(player, -SUBBED_ON_PROTECTION_SECONDS)
                >= SUBBED_ON_PROTECTION_SECONDS
            ]) > 0
        ]
        if not available_positions:
            return None

        pos = random.choice(available_positions)
        active_candidates = [
            player
            for player in roster[pos]
            if player not in self.sent_off_players
            and self.match_time - self.subbed_on_at.get(player, -SUBBED_ON_PROTECTION_SECONDS)
            >= SUBBED_ON_PROTECTION_SECONDS
        ]
        player_off = random.choice(active_candidates)
        player_on = bench[pos].pop(0)

        # Swap on-pitch player with bench substitute
        roster[pos].remove(player_off)
        roster[pos].append(player_on)
        self.subbed_on_at[player_on] = self.match_time
        if self.current_player == player_off:
            self.current_player = player_on
        self.subs_made[sub_team] += 1

        return GenericMatchEvent(
            id=f"{base_id}_sub",
            match_id=self.match_id,
            timestamp=round(self.match_time, 1),
            team=sub_team,
            player=player_on,
            x=self.x,
            y=self.y,
            type=EventType.SUBSTITUTION,
            details=f"{player_on} replaces {player_off}",
            player_off=player_off,
        )

    def _generate_next_events(self) -> list[MatchEvent]:
        base_id = f"e_{int(self.match_time * 10)}"
        progress = self._attacking_progress()

        # Check for a 2nd-half substitution window
        sub_event = self._maybe_make_substitution(base_id)
        if sub_event is not None:
            return [sub_event]

        # Shot probability scales in the final third (progress > 68)
        if progress < 68.0:
            shot_prob = 0.006
        else:
            shot_prob = ((progress - 68.0) / 32.0) ** 1.65 * 0.36

        # Moderate defensive duel rate so teams can build 5-9 pass control sequences
        defensive_prob = 0.10 if progress < 65.0 else 0.17

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

        forward_step = random.uniform(-3.0, 20.0) if progress < 75.0 else random.uniform(-5.0, 13.0)
        lateral_step = random.uniform(-16.0, 16.0)

        if progress > 78.0:
            lateral_step += (50.0 - self.y) * 0.25

        end_x = self._clamp_x(self.x + (direction * forward_step))
        end_y = self._clamp_y(self.y + lateral_step)

        dist_meters = round(math.hypot(end_x - self.x, end_y - self.y) * 1.05, 1)
        difficulty = round(min(0.95, max(0.1, (dist_meters / 48.0) + (0.18 if progress > 75.0 else 0.0))), 2)
        speed_kmh = round(min(95.0, max(22.0, dist_meters * random.uniform(1.8, 2.6))), 1)

        # Higher pass completion in build-up so teams can establish Control Index dominance
        completion_threshold = 0.94 - (difficulty * 0.22)
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
                self.x = self._clamp_x(goal_x - (self._attack_dir() * 10.0))
                self.y = 50.0
                self._switch_possession(keep_coordinates=True)
        else:
            self.x = self._clamp_x(goal_x - (self._attack_dir() * 12.0))
            self.y = 50.0
            self._switch_possession(keep_coordinates=True)

        return events

    def _handle_defensive_sequence(self, base_id: str) -> list[MatchEvent]:
        events: list[MatchEvent] = []
        opposing_team = self._get_opposing_team()
        progress = self._attacking_progress()
        opposing_player = self._pick_player(opposing_team, 100.0 - progress)

        if random.random() < 0.35:
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

        is_foul = random.random() < 0.30
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

        # Card check (24% of fouls produce a yellow or second-yellow red)
        if random.random() < 0.24:
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

        # Penalty check inside opponent's box
        if progress > 82.0 and 20.0 < self.y < 80.0:
            pen_x = 88.5 if self._attack_dir() > 0 else 11.5
            goal_x = self._goal_x(self.possession)
            attack_direction = self._attack_dir()
            self.x, self.y = pen_x, 50.0

            events.append(SetPieceEvent(
                id=f"{base_id}_pen",
                match_id=self.match_id,
                timestamp=round(self.match_time + 1.0, 1),
                team=self.possession,
                player=self.current_player,
                taker=self.current_player,
                x=self._clamp_x(pen_x - (attack_direction * 2.5)),
                y=50.0,
                type=EventType.PENALTY,
            ))

            # 72% penalty conversion, 28% dramatic penalty save
            is_pen_goal = random.random() < 0.72
            outcome = ShotOutcome.GOAL if is_pen_goal else ShotOutcome.SAVED
            penalty_target_y = random.choice([43.0, 57.0]) if is_pen_goal else 50.0
            pen_shot = ShotEvent(
                id=f"{base_id}_pen_shot",
                match_id=self.match_id,
                timestamp=round(self.match_time + 2.8, 1),
                team=self.possession,
                player=self.current_player,
                x=pen_x,
                y=50.0,
                xg=0.79,
                speed_kmh=round(random.uniform(92.0, 115.0), 1),
                distance=11.0,
                outcome=outcome,
                end_x=(
                    goal_x
                    if is_pen_goal
                    else self._clamp_x(goal_x - attack_direction * 0.5)
                ),
                end_y=penalty_target_y,
            )
            events.append(pen_shot)

            if is_pen_goal:
                events.append(GoalEvent(
                    id=f"{base_id}_pen_goal",
                    match_id=self.match_id,
                    timestamp=round(self.match_time + 3.3, 1),
                    team=self.possession,
                    player=self.current_player,
                    x=goal_x,
                    y=penalty_target_y,
                    shot_event_id=pen_shot.id,
                    scorer=self.current_player,
                ))
                self._reset_to_midfield()
            else:
                self.x = pen_shot.end_x if pen_shot.end_x is not None else goal_x
                self.y = pen_shot.end_y if pen_shot.end_y is not None else 50.0
                events.append(SaveEvent(
                    id=f"{base_id}_pen_save",
                    match_id=self.match_id,
                    timestamp=round(self.match_time + 3.3, 1),
                    team=opposing_team,
                    player=str(self.rosters[opposing_team]["GK"]),
                    x=self.x,
                    y=self.y,
                    shot_event_id=pen_shot.id,
                    difficulty=0.92,
                ))
                self._switch_possession(keep_coordinates=True)

        elif progress > 72.0 and random.random() < 0.60:
            events.extend(self._handle_shot_sequence(f"{base_id}_fk_shot"))

        return events

    def _switch_possession(self, keep_coordinates: bool = True):
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