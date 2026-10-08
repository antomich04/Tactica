from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from engine.event_simulator import EventSimulator
from engine.stats_engine import StatsEngine
from engine.moment_detector import MomentDetector
from engine.overlay_generator import moment_to_fast_overlay

router = APIRouter(prefix="/api")


@router.websocket("/overlays-stream")
async def stream_overlays(websocket: WebSocket):
    await websocket.accept()

    simulator = EventSimulator()
    engine = StatsEngine()
    detector = MomentDetector()

    try:
        async for event in simulator.stream_events():

            # Gets live metrics from the engine
            metrics = engine.process_event(event)

            # Determines if the received event is worth of becoming an overlay
            moment = detector.evaluate(event, metrics)

            if moment:
                overlay = moment_to_fast_overlay(moment)
                await websocket.send_text(overlay.model_dump_json())

    except WebSocketDisconnect:
        print("Frontend disconnected from overlays stream.")