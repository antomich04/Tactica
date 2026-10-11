from fastapi import APIRouter, Depends, Request
from engine.match_broadcaster import broadcaster
from config.rate_limiter import limiter
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/match")

@router.post("/start")
@limiter.limit("5/minute")
async def start_simulation(request: Request, user: dict = Depends(get_current_user)):
    return broadcaster.start_match()