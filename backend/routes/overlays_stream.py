import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from models.Overlays import Overlay, OverlayType, PersonaType

router = APIRouter(prefix="/api")

@router.websocket("/overlays-stream")
async def stream_overlays(websocket: WebSocket):
    await websocket.accept()
    
    try:
        match_time = 120.0
        counter = 1
        
        while match_time < 360.0:
            # Generates a mock broadcast overlay
            dummy_overlay = Overlay(
                id=f"ov_{counter:03d}",
                match_id="m_001",
                timestamp=match_time,
                duration=5.0,
                type=OverlayType.MOMENTUM_SHIFT,
                priority=1,
                language="en",
                persona=PersonaType.CASUAL,
                text="The match is turning into chaos with three rapid possession changes.",
                evidence_event_ids=["e_042", "e_043"],
                verified=True,
                meta={"chaos_level": 78}
            )
            
            await websocket.send_text(dummy_overlay.model_dump_json())
            
            counter += 1
            match_time += 15.5
            
            # Pauses for 3 seconds before yielding the next event to simulate live pacing
            await asyncio.sleep(3)
            
    except WebSocketDisconnect:
        print("Frontend disconnected from the stream.")