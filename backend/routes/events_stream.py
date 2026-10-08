from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from engine.event_simulator import EventSimulator
from engine.stats_engine import StatsEngine

router = APIRouter(prefix="/api")

@router.websocket("/events-stream")
async def stream_events(websocket: WebSocket):
    await websocket.accept()
    
    # Initializes a fresh match simulation and stats engine per connection
    simulator = EventSimulator()
    engine = StatsEngine()
    
    try:
        async for event in simulator.stream_events():
            #Feeds the event into the engine to calculate live Control vs Chaos
            live_metrics = engine.process_event(event)
            
            #Packages the raw event and the current match metrics together
            payload = {
                "event": event.model_dump(),
                "metrics": live_metrics
            }
            
            await websocket.send_json(payload)
            
    except WebSocketDisconnect:
        print("Frontend disconnected from the live events stream.")