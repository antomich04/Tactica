import asyncio
import logging
from typing import Dict, Set
from fastapi import WebSocket
from engine.event_simulator import EventSimulator
from engine.stats_engine import StatsEngine
from engine.moment_detector import MomentDetector
from engine.overlay_generator import moment_to_fast_overlay
from engine.momentum_tracker import MomentumTracker
from models.Moment import Moment
from models.Moment import MomentCategory
from agents.graph import build_tactica_workflow
from agents.state import PersonalizedOverlay, TacticaGraphState, UserContext
from agents.analyst.tools import (
    MatchAnalysisSnapshot,
    capture_analysis_snapshot,
    use_analysis_snapshot,
)

logger = logging.getLogger(__name__)

class MatchBroadcaster:
    def __init__(self):
        self.simulator = None
        self.stats_engine = None
        self.moment_detector = None
        self.momentum_tracker = None
        self.workflow = None

        self._crew_lock = asyncio.Lock()
        self.event_subscribers: Set[WebSocket] = set()
        self.overlay_subscribers: Set[WebSocket] = set()
        self.overlay_user_contexts: Dict[WebSocket, UserContext] = {}
        self._running_task: asyncio.Task | None = None
        self._agent_tasks: Set[asyncio.Task] = set()

    async def register_event_client(self, websocket: WebSocket):
        self.event_subscribers.add(websocket)

    def unregister_event_client(self, websocket: WebSocket):
        self.event_subscribers.discard(websocket)

    async def register_overlay_client(self, websocket: WebSocket, user: dict | None = None):
        self.overlay_subscribers.add(websocket)
        from models.Overlays import PersonaType
        raw_persona = user.get("persona", "casual") if user else "casual"
        self.overlay_user_contexts[websocket] = UserContext(
            persona=PersonaType(raw_persona) if raw_persona in PersonaType._value2member_map_ else PersonaType.CASUAL,
            language=user.get("lang", "en") if user else "en",
            favorite_club=user.get("team") if user else None,
            player_lock=user.get("player_lock") if user else None
        )

    def unregister_overlay_client(self, websocket: WebSocket):
        self.overlay_subscribers.discard(websocket)
        self.overlay_user_contexts.pop(websocket, None)

    def start_match(self) -> dict:
        if self._running_task and not self._running_task.done():
            return {"status": "error", "message": "A match is already in progress."}

        if self.workflow is None:
            self.workflow = build_tactica_workflow()
        
        self.simulator = EventSimulator() 
        self.stats_engine = StatsEngine()
        self.moment_detector = MomentDetector()
        self.momentum_tracker = MomentumTracker()
        
        self._running_task = asyncio.create_task(self._run_loop())
        
        return {
            "status": "success", 
            "message": "Match kicked off!",
            "match_id": self.simulator.match_id
        }

    async def _run_loop(self):
        async for event in self.simulator.stream_events():
            metrics = self.stats_engine.process_event(event)
            momentum_data = self.momentum_tracker.update(event)
            moment = self.moment_detector.evaluate(event, metrics)
            snapshot = None
            user_contexts = []
            moment_recipients = {}
            if moment and self.overlay_user_contexts:
                snapshot = capture_analysis_snapshot(
                    self.stats_engine, self.momentum_tracker, event.player
                )
                moment_recipients = dict(self.overlay_user_contexts)
                unique_contexts = {
                    context.model_dump_json(): context
                    for context in moment_recipients.values()
                }
                user_contexts = list(unique_contexts.values())

            event_payload = {
                "event": event.model_dump(),
                "metrics": metrics,
                "momentum": momentum_data
            }
            await self._broadcast_json(self.event_subscribers, event_payload)

            if moment:
                # Fast path, quick fire of overlay
                fast_overlay = moment_to_fast_overlay(moment)
                fast_overlay.meta["tier"] = "fast_template"
                await self._broadcast_text(self.overlay_subscribers, fast_overlay.model_dump_json())

                if snapshot and user_contexts:
                    task = asyncio.create_task(
                        self._run_agent_crew(
                            moment, snapshot, user_contexts, moment_recipients
                        )
                    )
                    self._agent_tasks.add(task)
                    task.add_done_callback(self._agent_tasks.discard)

    async def _run_agent_crew(
        self, 
        moment: Moment, 
        snapshot: MatchAnalysisSnapshot, 
        user_contexts: list[UserContext], 
        moment_recipients: Dict[WebSocket, UserContext]
    ):
        """Runs the agentic workflow using the frozen moment snapshot and fans out personalized results."""
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
                        await self._broadcast_overlay_to_profile(rich_overlay, moment_recipients)
                        
            except Exception as e:
                logger.exception(f"Agent crew failed on moment {moment.id}: {e}")

    async def _broadcast_overlay_to_profile(
        self,
        output: PersonalizedOverlay,
        moment_recipients: Dict[WebSocket, UserContext],
    ):
        payload = output.overlay.model_dump_json()
        for websocket, user_context in moment_recipients.items():
            if websocket not in self.overlay_user_contexts:
                continue
            if user_context != output.user_ctx:
                continue
            try:
                await websocket.send_text(payload)
            except Exception:
                logger.debug("Removing disconnected personalized overlay client.", exc_info=True)
                self.unregister_overlay_client(websocket)

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

# Initialized here so that both routes can refer to the same object
broadcaster = MatchBroadcaster()