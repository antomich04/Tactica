from fastapi import Depends, FastAPI
from auth import setup_auth, websocket_principal
from routes.overlays_stream import router as overlays_router

app = FastAPI()
setup_auth(app) 

app.include_router(overlays_router, dependencies=[Depends(websocket_principal)])

@app.get("/health")
def health_check():
    return {"status": "healthy"}
