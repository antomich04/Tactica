from fastapi import APIRouter, Depends
from engine.match_broadcaster import broadcaster
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/match")

@router.post("/start")
async def start_simulation(user: dict = Depends(get_current_user)):
    return broadcaster.start_match()