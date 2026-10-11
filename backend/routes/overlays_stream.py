from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from engine.match_broadcaster import broadcaster
from services.auth_service import get_ws_user

router = APIRouter(prefix="/api")

@router.websocket("/overlays-stream")
async def stream_overlays(websocket: WebSocket, user: dict = Depends(get_ws_user)):
    await websocket.accept()
    await broadcaster.register_overlay_client(websocket)
    
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        broadcaster.unregister_overlay_client(websocket)