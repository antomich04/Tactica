import asyncio
import logging
import time
import uuid
from typing import Dict, Set
from fastapi import WebSocket
from services.teams_service import get_featured_matchup
from engine.event_simulator import EventSimulator
from engine.stats_engine import StatsEngine
from engine.moment_detector import MomentDetector
from engine.overlay_generator import moment_to_fast_overlay
from engine.momentum_tracker import MomentumTracker
from models.Event import MatchEvent, EventType, CardColor
from models.Moment import Moment, MomentCategory
from models.MatchRecap import MatchRecapKeyEvent, MatchRecapMessage, MatchRecapStats, MatchSummary
from models.Overlays import Overlay, OverlayType, PersonaType
from agents.graph import build_match_recap_workflow, build_tactica_workflow
from agents.state import MatchRecapWorkflowState, PersonalizedOverlay, TacticaGraphState, UserContext
from agents.summarizer.node import build_fallback_match_recap
from services.match_recap_service import save_match_recap_record
from agents.analyst.tools import (
    MatchAnalysisSnapshot,
    capture_analysis_snapshot,
    use_analysis_snapshot,
)

logger = logging.getLogger(__name__)

MIN_OVERLAY_READ_SECONDS = 2.2
CONTROL_MOMENT_COOLDOWN_MATCH_SECONDS = 420.0
MATCH_RECAP_AGENT_TIMEOUT_SECONDS = 20.0


class MatchBroadcaster:
    def __init__(self):
        self.simulator: EventSimulator | None = None
        self.stats_engine: StatsEngine | None = None
        self.moment_detector: MomentDetector | None = None
        self.momentum_tracker: MomentumTracker | None = None
        self.workflow = None

        self._crew_lock = asyncio.Lock()
        self._overlay_send_lock = asyncio.Lock()
        self._last_overlay_sent_mono: float = 0.0
        self._last_control_overlay_match_time: float = -999.0

        self._pause_event = asyncio.Event()
        self._pause_event.set()  # Unpaused by default

        self.event_subscribers: Set[WebSocket] = set()
        self.event_user_contexts: Dict[WebSocket, UserContext] = {}
        self.event_user_subs: Dict[WebSocket, str] = {}
        self.overlay_subscribers: Set[WebSocket] = set()
        self.overlay_user_contexts: Dict[WebSocket, UserContext] = {}
        self.overlay_user_subs: Dict[WebSocket, str] = {}
        self._running_task: asyncio.Task | None = None
        self._agent_tasks: Set[asyncio.Task] = set()
        self._match_events: list[MatchEvent] = []
        self._final_summary: MatchSummary | None = None
        self._final_recaps: Dict[tuple[str, str], MatchRecapMessage] = {}

    def _build_user_context(self, user: dict | None) -> UserContext:
        raw_persona = user.get("persona", "casual") if user else "casual"
        return UserContext(
            persona=PersonaType(raw_persona)
            if raw_persona in PersonaType._value2member_map_
            else PersonaType.CASUAL,
            language=user.get("lang", "en") if user else "en",
            favorite_club=user.get("team") if user else None,
            player_lock=user.get("player_lock") if user else None,
        )

    async def register_event_client(self, websocket: WebSocket, user: dict | None = None):
        self.event_subscribers.add(websocket)
        self.event_user_contexts[websocket] = self._build_user_context(user)
        if user and user.get("sub") is not None:
            self.event_user_subs[websocket] = str(user["sub"])
        if self._final_summary is not None:
            await self._send_final_state(
                websocket,
                self.event_user_contexts[websocket],
                self.event_user_subs.get(websocket),
            )

    def unregister_event_client(self, websocket: WebSocket):
        self.event_subscribers.discard(websocket)
        self.event_user_contexts.pop(websocket, None)
        self.event_user_subs.pop(websocket, None)

    async def register_overlay_client(self, websocket: WebSocket, user: dict | None = None):
        self.overlay_subscribers.add(websocket)
        self.overlay_user_contexts[websocket] = self._build_user_context(user)
        if user and user.get("sub") is not None:
            self.overlay_user_subs[websocket] = str(user["sub"])

        if self._final_summary is not None:
            await self._send_final_state(
                websocket,
                self.overlay_user_contexts[websocket],
                self.overlay_user_subs.get(websocket),
            )

    def unregister_overlay_client(self, websocket: WebSocket):
        self.overlay_subscribers.discard(websocket)
        self.overlay_user_contexts.pop(websocket, None)
        self.overlay_user_subs.pop(websocket, None)

    async def _send_final_state(
        self,
        websocket: WebSocket,
        user_context: UserContext,
        user_sub: str | None,
    ) -> None:
        if self._final_summary is None:
            return

        await websocket.send_json(
            {
                "kind": "match_ended",
                "data": self._final_summary.model_dump(mode="json"),
            }
        )
        recap = self._final_recaps.get(
            (self._final_summary.match_id, user_sub or "")
        )
        if recap is None:
            recap = build_fallback_match_recap(self._final_summary, user_context)
            if user_sub is not None:
                self._final_recaps[(self._final_summary.match_id, user_sub)] = recap
                try:
                    await save_match_recap_record(
                        self._final_summary.match_id,
                        user_sub,
                        self._final_summary.model_dump(mode="json"),
                        recap.model_dump(mode="json"),
                    )
                except Exception:
                    logger.exception(
                        "Could not persist reconnect recap for match %s and user %s.",
                        self._final_summary.match_id,
                        user_sub,
                    )
        await websocket.send_json(
            {"kind": "match_recap", "data": recap.model_dump(mode="json")}
        )

    async def start_match(
        self,
        home_team_name: str | None = None,
        away_team_name: str | None = None,
        restart: bool = False,
    ) -> dict:
        if self._running_task and not self._running_task.done():
            if not restart:
                self._pause_event.set()
                return {
                    "status": "success",
                    "message": "Match resumed",
                    "match_id": self.simulator.match_id if self.simulator else None,
                    "paused": False,
                }
            await self.stop_match()

        matchup = await get_featured_matchup(
            home_name=home_team_name, away_name=away_team_name
        )
        home_team = matchup["home_team"]
        away_team = matchup["away_team"]

        if self.workflow is None:
            self.workflow = build_tactica_workflow()

        self._pause_event.set()
        self._last_overlay_sent_mono = 0.0
        self._last_control_overlay_match_time = -999.0
        self._match_events = []
        self._final_summary = None
        self._final_recaps = {}

        self.simulator = EventSimulator(
            team_a_data=home_team,
            team_b_data=away_team,
            pause_event=self._pause_event,
        )
        self.stats_engine = StatsEngine(
            home_team=home_team["name"],
            away_team=away_team["name"],
        )
        self.moment_detector = MomentDetector()
        self.momentum_tracker = MomentumTracker()

        self._running_task = asyncio.create_task(self._run_loop())

        return {
            "status": "success",
            "message": "Match kicked off!",
            "match_id": self.simulator.match_id,
            "home_team": home_team["name"],
            "away_team": away_team["name"],
            "paused": False,
        }

    def pause_match(self) -> dict:
        if self._running_task and not self._running_task.done():
            # If the match already auto-paused at halftime and the user clicks the toggle button,
            # resume the second half seamlessly instead of getting stuck in a double-pause.
            if not self._pause_event.is_set() and self.simulator and self.simulator.is_halftime_pause:
                self._pause_event.set()
                return {
                    "status": "success",
                    "message": "Second half resumed",
                    "match_time": self.simulator.match_time,
                    "paused": False,
                }

            self._pause_event.clear()
            return {
                "status": "success",
                "message": "Match paused",
                "match_time": self.simulator.match_time if self.simulator else 0.0,
                "paused": True,
            }
        return {"status": "error", "message": "No active match to pause."}

    def resume_match(self) -> dict:
        if self._running_task and not self._running_task.done():
            self._pause_event.set()
            return {
                "status": "success",
                "message": "Match resumed",
                "match_time": self.simulator.match_time if self.simulator else 0.0,
                "paused": False,
            }
        return {"status": "error", "message": "No active match to resume."}

    def get_match_status(self) -> dict:
        running = bool(self._running_task and not self._running_task.done())
        paused = running and not self._pause_event.is_set()
        return {
            "status": "success",
            "running": running,
            "paused": paused,
            "halftime_pause": bool(self.simulator and self.simulator.is_halftime_pause),
            "match_time": self.simulator.match_time if self.simulator else 0.0,
            "match_ended": self._final_summary is not None,
            "summary": self._final_summary.model_dump(mode="json") if self._final_summary else None,
        }

    async def stop_match(self) -> dict:
        self._pause_event.set()
        if self._running_task and not self._running_task.done():
            self._running_task.cancel()
            try:
                await self._running_task
            except asyncio.CancelledError:
                pass
        self._running_task = None
        return {"status": "success", "message": "Match stopped"}

    def _build_custom_overlay(
        self,
        event: MatchEvent,
        overlay_type: OverlayType,
        text: str,
        priority: int,
        duration: float = 4.0,
    ) -> Overlay:
        return Overlay(
            id=f"ov_{uuid.uuid4().hex[:8]}",
            match_id=event.match_id,
            timestamp=event.timestamp,
            duration=duration,
            type=overlay_type,
            priority=priority,
            language="en",
            persona=PersonaType.CASUAL,
            text=text,
            evidence_event_ids=[event.id],
            verified=True,
            meta={
                "tier": "fast_template",
                "team": event.team,
                "player": getattr(event, "player", None),
            },
        )

    def _check_supplementary_overlay(self, event: MatchEvent, metrics: dict) -> Overlay | None:
        """
        Ensures Penalty Saves, Yellow Cards, Substitutions, and Control Index Dominance
        always emit a broadcast overlay even if MomentDetector ignores them.
        """
        # 1. Penalty Save
        if event.type == EventType.SAVE and (
            "_pen_save" in event.id or (getattr(event, "difficulty", 0) or 0) >= 0.88
        ):
            return self._build_custom_overlay(
                event,
                overlay_type=OverlayType.PENALTY_SAVE,
                text=f"PENALTY SAVED! {event.player} denies the spot-kick for {event.team}!",
                priority=1,
                duration=4.5,
            )

        # 2. Yellow Card
        if event.type == EventType.CARD and getattr(event, "card_color", None) == CardColor.YELLOW:
            reason = getattr(event, "reason", None) or "Tactical Foul"
            return self._build_custom_overlay(
                event,
                overlay_type=OverlayType.YELLOW_CARD,
                text=f"YELLOW CARD: {event.player} ({event.team}) is booked for a {reason.lower()}.",
                priority=2,
                duration=4.0,
            )

        # 3. Substitution
        if event.type == EventType.SUBSTITUTION:
            details = getattr(event, "details", None) or f"{event.player} enters the pitch"
            return self._build_custom_overlay(
                event,
                overlay_type=OverlayType.SUBSTITUTION,
                text=f"SUBSTITUTION ({event.team}): {details}.",
                priority=3,
                duration=4.0,
            )

        # 4. Tactical Control Dominance (when one team controls >= 74% and chaos is low)
        ctrl_idx = metrics.get("control_index", 0.0)
        chaos_idx = metrics.get("chaos_index", 100.0)
        ctrl_team = metrics.get("controlling_team") or event.team
        if (
            ctrl_idx >= 74.0
            and chaos_idx <= 45.0
            and (event.timestamp - self._last_control_overlay_match_time) >= CONTROL_MOMENT_COOLDOWN_MATCH_SECONDS
        ):
            self._last_control_overlay_match_time = event.timestamp
            return self._build_custom_overlay(
                event,
                overlay_type=OverlayType.TACTICAL_CONTROL,
                text=(
                    f"TACTICAL CONTROL: {ctrl_team} dictating the tempo with a "
                    f"{ctrl_idx:.1f}% Control Index (Chaos: {chaos_idx:.1f}%)."
                ),
                priority=3,
                duration=4.5,
            )

        return None

    async def _paced_broadcast_overlay(self, overlay: Overlay, is_critical: bool = False):
        """
        Ensures every overlay stays on screen long enough to be read by a human
        before the next overlay is sent.
        """
        async with self._overlay_send_lock:
            elapsed = time.monotonic() - self._last_overlay_sent_mono
            if elapsed < MIN_OVERLAY_READ_SECONDS:
                if not is_critical:
                    # Drop low-priority ambient overlay if viewer is currently reading one
                    return
                await asyncio.sleep(MIN_OVERLAY_READ_SECONDS - elapsed)

            await self._broadcast_text(
                self.overlay_subscribers, overlay.model_dump_json()
            )
            self._last_overlay_sent_mono = time.monotonic()

    async def _run_loop(self):
        try:
            async for event in self.simulator.stream_events():
                self._match_events.append(event)
                metrics = self.stats_engine.process_event(event)
                momentum_data = self.momentum_tracker.update(event)
                moment = self.moment_detector.evaluate(event, metrics)

                is_halftime_whistle = bool(
                    self.simulator and self.simulator.is_halftime_pause and event.timestamp == 2700.0
                )

                event_payload = {
                    "event": event.model_dump(),
                    "metrics": {
                        **metrics,
                        "paused": is_halftime_whistle,
                        "halftime_pause": is_halftime_whistle,
                    },
                    "momentum": momentum_data,
                }
                await self._broadcast_json(self.event_subscribers, event_payload)

                if is_halftime_whistle:
                    ht_overlay = self._build_custom_overlay(
                        event,
                        overlay_type=OverlayType.HALF_TIME,
                        text="HALF TIME (45:00): The referee blows for the interval. Press Resume to kick off the 2nd half.",
                        priority=1,
                        duration=5.0,
                    )
                    await self._paced_broadcast_overlay(ht_overlay, is_critical=True)
                    continue

                if moment:
                    is_crit = moment.category in (
                        MomentCategory.GOAL,
                        MomentCategory.RED_CARD,
                        MomentCategory.PENALTY,
                    )
                    fast_overlay = moment_to_fast_overlay(moment)
                    fast_overlay.meta["tier"] = "fast_template"
                    await self._paced_broadcast_overlay(
                        fast_overlay, is_critical=is_crit
                    )

                    if self.overlay_user_contexts:
                        snapshot = capture_analysis_snapshot(
                            self.stats_engine, self.momentum_tracker, event.player
                        )
                        moment_recipients = dict(self.overlay_user_contexts)
                        unique_contexts = {
                            context.model_dump_json(): context
                            for context in moment_recipients.values()
                        }
                        user_contexts = list(unique_contexts.values())

                        task = asyncio.create_task(
                            self._run_agent_crew(
                                moment, snapshot, user_contexts, moment_recipients
                            )
                        )
                        self._agent_tasks.add(task)
                        task.add_done_callback(self._agent_tasks.discard)
                else:
                    supp_overlay = self._check_supplementary_overlay(event, metrics)
                    if supp_overlay:
                        is_crit_supp = supp_overlay.type in (
                            OverlayType.PENALTY_SAVE,
                            OverlayType.YELLOW_CARD,
                            OverlayType.SUBSTITUTION,
                        )
                        await self._paced_broadcast_overlay(
                            supp_overlay, is_critical=is_crit_supp
                        )
        except asyncio.CancelledError:
            logger.info("Match simulation loop cancelled cleanly.")
        else:
            if self.simulator and self.simulator.match_time >= self.simulator.full_time:
                await self._finish_match()

    def _build_match_summary(self) -> MatchSummary:
        if not self.simulator:
            raise RuntimeError("Cannot build a match summary without an active simulator.")

        goals = [event for event in self._match_events if event.type == EventType.GOAL]
        home_score = sum(event.team == self.simulator.team_a for event in goals)
        away_score = sum(event.team == self.simulator.team_b for event in goals)
        shots = [event for event in self._match_events if event.type == EventType.SHOT]
        passes = [event for event in self._match_events if event.type == EventType.PASS]
        cards = [event for event in self._match_events if event.type == EventType.CARD]

        def enum_value(value) -> str:
            return value.value if hasattr(value, "value") else str(value)

        def team_stats(team_name: str) -> MatchRecapStats:
            team_shots = [event for event in shots if event.team == team_name]
            team_passes = [event for event in passes if event.team == team_name]
            team_cards = [event for event in cards if event.team == team_name]
            return MatchRecapStats(
                shots=len(team_shots),
                shots_on_target=sum(
                    enum_value(getattr(event, "outcome", "")) in ("goal", "saved")
                    for event in team_shots
                ),
                passes_attempted=len(team_passes),
                passes_completed=sum(
                    enum_value(getattr(event, "outcome", "")) == "completed"
                    for event in team_passes
                ),
                corners=sum(
                    event.type == EventType.CORNER and event.team == team_name
                    for event in self._match_events
                ),
                yellow_cards=sum(
                    getattr(event, "card_color", None) == CardColor.YELLOW
                    for event in team_cards
                ),
                red_cards=sum(
                    getattr(event, "card_color", None) == CardColor.RED
                    for event in team_cards
                ),
            )

        stats = {
            "home": team_stats(self.simulator.team_a),
            "away": team_stats(self.simulator.team_b),
        }

        key_events: list[MatchRecapKeyEvent] = []
        for event in self._match_events:
            if event.type == EventType.GOAL:
                details = f"Goal by {getattr(event, 'scorer', event.player)}"
            elif event.type == EventType.CARD:
                details = f"{enum_value(event.card_color).title()} card"
                reason = getattr(event, "reason", None)
                if reason:
                    details += f": {reason}"
            elif event.type == EventType.PENALTY:
                details = "Penalty"
            elif event.type == EventType.SUBSTITUTION:
                details = getattr(event, "details", None) or "Substitution"
            elif (
                event.type == EventType.SAVE
                and (getattr(event, "difficulty", 0.0) or 0.0) >= 0.72
            ):
                details = "Important save"
            else:
                continue

            key_events.append(
                MatchRecapKeyEvent(
                    type=enum_value(event.type),
                    timestamp=event.timestamp,
                    team=event.team,
                    player=event.player,
                    details=details,
                )
            )

        key_events = key_events[-12:]
        return MatchSummary(
            match_id=self.simulator.match_id,
            home_team=self.simulator.team_a,
            away_team=self.simulator.team_b,
            home_score=home_score,
            away_score=away_score,
            match_time=self.simulator.full_time,
            stats=stats,
            key_events=key_events,
        )

    async def _finish_match(self):
        if self._final_summary is not None:
            return

        self._final_summary = self._build_match_summary()
        recipients = {
            **self.event_user_contexts,
            **self.overlay_user_contexts,
        }
        user_subs = {**self.event_user_subs, **self.overlay_user_subs}
        summary_payload = self._final_summary.model_dump(mode="json")

        # Show full time immediately while personalized recaps are generated.
        await self._broadcast_json(
            self.event_subscribers,
            {
                "kind": "match_ended",
                "data": summary_payload,
            },
        )

        # 1. Run the AI Match Recap workflow so we store the AI recap (not the fallback)
        unique_contexts = {
            context.model_dump_json(): context for context in recipients.values()
        }
        if recipients and unique_contexts:
            try:
                # Await directly here instead of background task so the DB stores the AI output immediately
                await asyncio.wait_for(
                    self._run_match_recap(
                        self._final_summary, list(unique_contexts.values()), recipients, persist_only=True
                    ),
                    timeout=20.0,
                )
            except Exception:
                logger.exception(
                    "AI match recap generation timed out or failed for match %s; falling back.",
                    self._final_summary.match_id,
                )

        # 2. Ensure public record and any missing user subs have at least a fallback
        try:
            default_recap = build_fallback_match_recap(
                self._final_summary, UserContext()
            )
            await save_match_recap_record(
                self._final_summary.match_id,
                "__public__",
                summary_payload,
                default_recap.model_dump(mode="json"),
            )
        except Exception:
            logger.exception(
                "Could not persist public final summary for match %s.",
                self._final_summary.match_id,
            )

        contexts_by_sub = {
            user_subs[websocket]: context
            for websocket, context in recipients.items()
            if websocket in user_subs
        }
        for user_sub, user_context in contexts_by_sub.items():
            if (self._final_summary.match_id, user_sub) not in self._final_recaps:
                fallback = build_fallback_match_recap(self._final_summary, user_context)
                self._final_recaps[(self._final_summary.match_id, user_sub)] = fallback
                try:
                    await save_match_recap_record(
                        self._final_summary.match_id,
                        user_sub,
                        summary_payload,
                        fallback.model_dump(mode="json"),
                    )
                except Exception:
                    logger.exception(
                        "Could not persist final recap fallback for match %s and user %s.",
                        self._final_summary.match_id,
                        user_sub,
                    )

        # 3. Broadcast final AI recaps over WebSockets
        if recipients:
            for user_context in unique_contexts.values():
                recap = self._final_recaps.get(
                    (self._final_summary.match_id, list(user_subs.values())[0] if user_subs else "")
                )
                if recap:
                    await self._broadcast_match_recap(recap, user_context, recipients)

    async def _run_match_recap(
        self,
        summary: MatchSummary,
        user_contexts: list[UserContext],
        recipients: Dict[WebSocket, UserContext],
        persist_only: bool = False,
    ):
        async def generate(user_context: UserContext) -> MatchRecapMessage:
            try:
                workflow = build_match_recap_workflow()
                result = await workflow.run(
                    MatchRecapWorkflowState(
                        summary=summary,
                        user_context=user_context,
                    )
                )
                recaps = result.get_outputs()
                if recaps:
                    return recaps[0]
            except Exception:
                logger.exception(
                    "Match recap workflow failed for match %s and persona %s/%s.",
                    summary.match_id,
                    user_context.persona.value,
                    user_context.language,
                )
            return build_fallback_match_recap(summary, user_context)

        results = await asyncio.gather(
            *(generate(user_context) for user_context in user_contexts),
            return_exceptions=True,
        )

        for user_context, result in zip(user_contexts, results):
            if isinstance(result, BaseException):
                recap = build_fallback_match_recap(summary, user_context)
            else:
                recap = result

            for websocket, recipient_context in recipients.items():
                if recipient_context != user_context:
                    continue
                user_sub = (
                    self.overlay_user_subs.get(websocket)
                    or self.event_user_subs.get(websocket)
                )
                if user_sub is None:
                    continue
                self._final_recaps[(summary.match_id, user_sub)] = recap
                try:
                    await save_match_recap_record(
                        summary.match_id,
                        user_sub,
                        summary.model_dump(mode="json"),
                        recap.model_dump(mode="json"),
                    )
                except Exception:
                    logger.exception(
                        "Could not persist final recap for match %s and user %s.",
                        summary.match_id,
                        user_sub,
                    )

            if not persist_only:
                await self._broadcast_match_recap(recap, user_context, recipients)

    async def _broadcast_match_recap(
        self,
        recap: MatchRecapMessage,
        user_context: UserContext,
        recipients: Dict[WebSocket, UserContext],
    ):
        async with self._overlay_send_lock:
            sent_user_subs: set[str] = set()
            for websocket, recipient_context in recipients.items():
                connected_context = self.overlay_user_contexts.get(
                    websocket, self.event_user_contexts.get(websocket)
                )
                if connected_context != user_context:
                    continue
                user_sub = (
                    self.overlay_user_subs.get(websocket)
                    or self.event_user_subs.get(websocket)
                )
                if user_sub is not None and user_sub in sent_user_subs:
                    continue
                try:
                    await websocket.send_json(
                        {"kind": "match_recap", "data": recap.model_dump(mode="json")}
                    )
                    if user_sub is not None:
                        sent_user_subs.add(user_sub)
                except Exception:
                    logger.debug(
                        "Removing disconnected match recap client.",
                        exc_info=True,
                    )
                    self.unregister_overlay_client(websocket)
                    self.unregister_event_client(websocket)

    async def _run_agent_crew(
        self,
        moment: Moment,
        snapshot: MatchAnalysisSnapshot,
        user_contexts: list[UserContext],
        moment_recipients: Dict[WebSocket, UserContext],
    ):
        high_priority = moment.category in (
            MomentCategory.GOAL,
            MomentCategory.RED_CARD,
            MomentCategory.PENALTY,
        )

        if self._crew_lock.locked() and not high_priority:
            return

        async with self._crew_lock:
            try:
                with use_analysis_snapshot(snapshot):
                    workflow = build_tactica_workflow()

                    initial_state = TacticaGraphState(
                        moment=moment,
                        user_contexts=user_contexts,
                    )

                    result = await workflow.run(initial_state)
                    outputs = result.get_outputs()

                    for rich_overlay in outputs:
                        await self._broadcast_overlay_to_profile(
                            rich_overlay, moment_recipients
                        )

            except Exception as e:
                logger.exception(f"Agent crew failed on moment {moment.id}: {e}")

    async def _broadcast_overlay_to_profile(
        self,
        output: PersonalizedOverlay,
        moment_recipients: Dict[WebSocket, UserContext],
    ):
        async with self._overlay_send_lock:
            elapsed = time.monotonic() - self._last_overlay_sent_mono
            if elapsed < MIN_OVERLAY_READ_SECONDS:
                await asyncio.sleep(MIN_OVERLAY_READ_SECONDS - elapsed)

            payload = output.overlay.model_dump_json()
            for websocket, user_context in moment_recipients.items():
                if websocket not in self.overlay_user_contexts:
                    continue
                if user_context != output.user_ctx:
                    continue
                try:
                    await websocket.send_text(payload)
                except Exception:
                    logger.debug(
                        "Removing disconnected personalized overlay client.",
                        exc_info=True,
                    )
                    self.unregister_overlay_client(websocket)
            self._last_overlay_sent_mono = time.monotonic()

    async def _broadcast_json(self, subscribers: Set[WebSocket], payload: dict):
        for ws in list(subscribers):
            try:
                await ws.send_json(payload)
            except Exception:
                logger.debug("Removing disconnected stream client.", exc_info=True)
                subscribers.discard(ws)

    async def _broadcast_text(self, subscribers: Set[WebSocket], payload: str):
        for ws in list(subscribers):
            try:
                await ws.send_text(payload)
            except Exception:
                logger.debug("Removing disconnected stream client.", exc_info=True)
                if subscribers is self.overlay_subscribers:
                    self.unregister_overlay_client(ws)
                else:
                    subscribers.discard(ws)


broadcaster = MatchBroadcaster()