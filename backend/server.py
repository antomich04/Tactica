import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from config.rate_limiter import limiter
from routes.overlays_stream import router as overlays_router
from routes.events_stream import router as events_router
from routes.match_control import router as match_control_router
from routes.auth_router import router as auth_router
from routes.account_router import router as account_router
from dotenv import load_dotenv

app = FastAPI()

load_dotenv()

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_DEV_URL")],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)

app.include_router(overlays_router)
app.include_router(events_router)
app.include_router(match_control_router)
app.include_router(auth_router)
app.include_router(account_router)

@app.get("/health")
@limiter.limit("5/minute")
def health_check(request: Request):
    return {"status": "healthy"}