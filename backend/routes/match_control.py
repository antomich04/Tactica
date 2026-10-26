from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from engine.match_broadcaster import broadcaster
from config.rate_limiter import limiter
from services.auth_service import get_current_user
from services.match_recap_service import get_match_recap_record
from agents.state import UserContext
from agents.summarizer.node import build_fallback_match_recap
from models.MatchRecap import MatchSummary
from models.Overlays import PersonaType

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


@router.get("/status")
@limiter.limit("30/minute")
async def match_status(request: Request, user: dict = Depends(get_current_user)):
    return broadcaster.get_match_status()


@router.get("/recap/latest")
@limiter.limit("30/minute")
async def latest_match_recap(
    request: Request, user: dict = Depends(get_current_user)
):
    record = await get_match_recap_record(str(user["sub"]))
    return {"status": "success", "match": _personalize_saved_record(record, user)}


@router.get("/recap/{match_id}")
@limiter.limit("30/minute")
async def match_recap(
    match_id: str,
    request: Request,
    user: dict = Depends(get_current_user),
):
    record = await get_match_recap_record(str(user["sub"]), match_id)
    return {"status": "success", "match": _personalize_saved_record(record, user)}


def _personalize_saved_record(record: dict | None, user: dict) -> dict | None:
    if record is None:
        return None

    summary = MatchSummary.model_validate(record["summary"])
    if record["owner"] == str(user["sub"]):
        return {"summary": record["summary"], "recap": record["recap"]}

    raw_persona = user.get("persona", "casual")
    persona = (
        PersonaType(raw_persona)
        if raw_persona in PersonaType._value2member_map_
        else PersonaType.CASUAL
    )
    language = user.get("lang", "en")
    if language not in ("en", "es", "pt", "gr"):
        language = "en"
    context = UserContext(
        persona=persona,
        language=language,
        favorite_club=user.get("team"),
        player_lock=user.get("player_lock"),
    )
    recap = build_fallback_match_recap(summary, context)
    return {"summary": record["summary"], "recap": recap.model_dump(mode="json")}


@router.post("/stop")
@limiter.limit("10/minute")
async def stop_simulation(request: Request, user: dict = Depends(get_current_user)):
    return await broadcaster.stop_match()