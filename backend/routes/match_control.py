from fastapi import APIRouter
from engine.match_broadcaster import broadcaster

router = APIRouter(prefix="/api/match")

@router.post("/start")
async def start_simulation():
    return broadcaster.start_match()