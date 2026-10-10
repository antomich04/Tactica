from fastapi import Depends, FastAPI
from auth import setup_auth, websocket_principal
from routes.overlays_stream import router as overlays_router
from routes.events_stream import router as events_router
from routes.match_control import router as match_control_router

app = FastAPI()
setup_auth(app)
app.include_router(overlays_router, dependencies=[Depends(websocket_principal)])
app.include_router(events_router, dependencies=[Depends(websocket_principal)])
app.include_router(match_control_router)

@app.get("/health")
def health_check():
    return {"status": "healthy"}