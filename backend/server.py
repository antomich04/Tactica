import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.overlays_stream import router as overlays_router
from routes.events_stream import router as events_router
from routes.match_control import router as match_control_router
from routes.auth_router import router as auth_router
from dotenv import load_dotenv

app = FastAPI()

load_dotenv()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_DEV_URL")],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)

app.include_router(overlays_router)
app.include_router(events_router)
app.include_router(match_control_router)
app.include_router(auth_router)

@app.get("/health")
def health_check():
    return {"status": "healthy"}
