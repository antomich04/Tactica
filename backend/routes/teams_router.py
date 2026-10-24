from fastapi import APIRouter, Depends, Query, Request
from config.rate_limiter import limiter
from services.auth_service import get_current_user
from services.teams_service import (
    get_all_teams,
    get_featured_matchup,
    get_team_by_identifier,
)

router = APIRouter(prefix="/api/teams", tags=["Teams"])


@router.get("")
@limiter.limit("30/minute")
async def list_teams(
    request: Request,
    include_players: bool = Query(True),
    user: dict = Depends(get_current_user),
):
    teams = await get_all_teams(include_players=include_players)
    return {"status": "success", "teams": teams}


@router.get("/next-match")
@limiter.limit("30/minute")
async def next_match(
    request: Request,
    home: str | None = Query(None),
    away: str | None = Query(None),
    user: dict = Depends(get_current_user),
):
    preferred_home = home or user.get("team") or None
    return await get_featured_matchup(home_name=preferred_home, away_name=away)


@router.get("/{identifier}")
@limiter.limit("30/minute")
async def get_team(
    identifier: str,
    request: Request,
    user: dict = Depends(get_current_user),
):
    team = await get_team_by_identifier(identifier)
    return {"status": "success", "team": team}