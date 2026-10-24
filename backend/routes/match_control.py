from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from engine.match_broadcaster import broadcaster
from config.rate_limiter import limiter
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/match", tags=["Match"])


class StartMatchPayload(BaseModel):
    home_team: str | None = None
    away_team: str | None = None
    restart: bool = False


@router.post("/start")
@limiter.limit("10/minute")
async def start_simulation(
    request: Request,
    payload: StartMatchPayload | None = None,
    user: dict = Depends(get_current_user),
):
    home = payload.home_team if payload else None
    away = payload.away_team if payload else None
    restart = payload.restart if payload else False
    return await broadcaster.start_match(
        home_team_name=home or user.get("team"),
        away_team_name=away,
        restart=restart,
    )


@router.post("/pause")
@limiter.limit("20/minute")
async def pause_simulation(request: Request, user: dict = Depends(get_current_user)):
    return broadcaster.pause_match()


@router.post("/resume")
@limiter.limit("20/minute")
async def resume_simulation(request: Request, user: dict = Depends(get_current_user)):
    return broadcaster.resume_match()


@router.post("/stop")
@limiter.limit("10/minute")
async def stop_simulation(request: Request, user: dict = Depends(get_current_user)):
    return await broadcaster.stop_match()