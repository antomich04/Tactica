from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from engine.match_broadcaster import broadcaster

router = APIRouter(prefix="/api")

@router.websocket("/overlays-stream")
async def stream_overlays(websocket: WebSocket):
    await websocket.accept()
    await broadcaster.register_overlay_client(websocket)
    
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        broadcaster.unregister_overlay_client(websocket)