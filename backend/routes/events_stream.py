from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from engine.match_broadcaster import broadcaster

router = APIRouter(prefix="/api")

@router.websocket("/events-stream")
async def stream_events(websocket: WebSocket):
    await websocket.accept()
    await broadcaster.register_event_client(websocket)
    
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        broadcaster.unregister_event_client(websocket)