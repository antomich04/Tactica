import asyncio
from typing import Set
from fastapi import WebSocket
from engine.event_simulator import EventSimulator
from engine.stats_engine import StatsEngine
from engine.moment_detector import MomentDetector
from engine.overlay_generator import moment_to_fast_overlay
from engine.momentum_tracker import MomentumTracker

class MatchBroadcaster:
    def __init__(self):
        self.simulator = None
        self.stats_engine = None
        self.moment_detector = None
        self.momentum_tracker = None
        
        self.event_subscribers: Set[WebSocket] = set()
        self.overlay_subscribers: Set[WebSocket] = set()
        self._running_task: asyncio.Task | None = None

    async def register_event_client(self, websocket: WebSocket):
        self.event_subscribers.add(websocket)

    def unregister_event_client(self, websocket: WebSocket):
        self.event_subscribers.discard(websocket)

    async def register_overlay_client(self, websocket: WebSocket):
        self.overlay_subscribers.add(websocket)

    def unregister_overlay_client(self, websocket: WebSocket):
        self.overlay_subscribers.discard(websocket)

    def start_match(self) -> dict:
        if self._running_task and not self._running_task.done():
            return {"status": "error", "message": "A match is already in progress."}
        
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

            event_payload = {
                "event": event.model_dump(),
                "metrics": metrics,
                "momentum": momentum_data
            }
            await self._broadcast_json(self.event_subscribers, event_payload)

            moment = self.moment_detector.evaluate(event, metrics)
            if moment:
                overlay = moment_to_fast_overlay(moment)
                await self._broadcast_text(self.overlay_subscribers, overlay.model_dump_json())

    async def _broadcast_json(self, subscribers: Set[WebSocket], payload: dict):
        for ws in list(subscribers):
            try:
                await ws.send_json(payload)
            except Exception:
                subscribers.discard(ws)

    async def _broadcast_text(self, subscribers: Set[WebSocket], payload: str):
        for ws in list(subscribers):
            try:
                await ws.send_text(payload)
            except Exception:
                subscribers.discard(ws)

# Initialized here so that both routes can refer to the same object
broadcaster = MatchBroadcaster()