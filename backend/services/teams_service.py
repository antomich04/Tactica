from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from config.database_client import get_db_client
from config.db_retry_mechanism import with_db_retry
from models.Team import Team, Player

# Maps each formation's DEF / MID / FWD starter counts to exact coordinates
FORMATION_SLOTS: dict[str, dict[str, list[str]]] = {
    "4-3-3":     {"DEF": ["RB", "RCB", "LCB", "LB"], "MID": ["CDM", "RCM", "LCM"], "FWD": ["RW", "ST", "LW"]},
    "4-2-3-1":   {"DEF": ["RB", "RCB", "LCB", "LB"], "MID": ["RDM", "LDM", "RM", "CAM", "LM"], "FWD": ["ST"]},
    "3-5-2":     {"DEF": ["RCB", "CB", "LCB"], "MID": ["RM", "RCM", "CDM", "LCM", "LM"], "FWD": ["RS", "LS"]},
    "4-2-4":     {"DEF": ["RB", "RCB", "LCB", "LB"], "MID": ["RCM", "LCM"], "FWD": ["RW", "RS", "LS", "LW"]},
    "3-4-1-2":   {"DEF": ["RCB", "CB", "LCB"], "MID": ["RM", "RDM", "LDM", "LM", "CAM"], "FWD": ["RS", "LS"]},
    "3-4-2-1":   {"DEF": ["RCB", "CB", "LCB"], "MID": ["RM", "RDM", "LDM", "LM", "RCM", "LCM"], "FWD": ["ST"]},
    "4-4-1-1":   {"DEF": ["RB", "RCB", "LCB", "LB"], "MID": ["RM", "RCM", "LCM", "LM", "CAM"], "FWD": ["ST"]},
    "5-4-1":     {"DEF": ["RB", "RCB", "CB", "LCB", "LB"], "MID": ["RM", "RCM", "LCM", "LM"], "FWD": ["ST"]},
    "4-4-2":     {"DEF": ["RB", "RCB", "LCB", "LB"], "MID": ["RM", "RCM", "LCM", "LM"], "FWD": ["RS", "LS"]},
    "4-1-2-1-2": {"DEF": ["RB", "RCB", "LCB", "LB"], "MID": ["CDM", "RCM", "LCM", "CAM"], "FWD": ["RS", "LS"]},
    "3-2-4-1":   {"DEF": ["RCB", "CB", "LCB"], "MID": ["RDM", "LDM", "RM", "RCM", "LCM", "LM"], "FWD": ["ST"]},
    "4-1-4-1":   {"DEF": ["RB", "RCB", "LCB", "LB"], "MID": ["CDM", "RM", "RCM", "LCM", "LM"], "FWD": ["ST"]},
    "4-3-2-1":   {"DEF": ["RB", "RCB", "LCB", "LB"], "MID": ["RDM", "CDM", "LDM", "RCM", "LCM"], "FWD": ["ST"]},
}

FALLBACK_SLOTS: dict[str, list[str]] = {
    "GK": ["GK"],
    "DEF": ["RB", "RCB", "LCB", "LB", "CB"],
    "MID": ["CDM", "RCM", "LCM", "CAM", "RM", "LM"],
    "FWD": ["ST", "RW", "LW", "RS", "LS"],
}


def _serialize_player(player: Player, tactical_role: str | None = None) -> dict:
    return {
        "id": player.id,
        "team_id": player.team_id,
        "name": player.name,
        "squad_number": player.squad_number,
        "position": player.position,
        "role": tactical_role or player.position,
        "nationality": player.nationality,
        "tier": player.tier,
    }


def _formation_starter_quotas(formation: str) -> dict[str, int] | None:
    parts = formation.split("-")
    if len(parts) < 2 or not all(part.isdigit() for part in parts):
        return None

    formation_counts = [int(part) for part in parts]
    if any(count <= 0 for count in formation_counts) or sum(formation_counts) != 10:
        return None

    return {
        "GK": 1,
        "DEF": formation_counts[0],
        "MID": sum(formation_counts[1:-1]),
        "FWD": formation_counts[-1],
    }


def _serialize_team(team: Team, include_players: bool = True) -> dict:
    formation = team.formation.strip()
    data = {
        "id": team.id,
        "name": team.name,
        "short_code": team.short_code,
        "primary_color": team.primary_color,
        "secondary_color": team.secondary_color,
        "formation": formation,
        "tactical_style": team.tactical_style,
        "stadium_name": team.stadium_name,
        "badge_svg": team.badge_svg,
    }

    if include_players:
        slot_map = FORMATION_SLOTS.get(formation, FALLBACK_SLOTS)
        pos_counters = {"GK": 0, "DEF": 0, "MID": 0, "FWD": 0}
        starters_quota = _formation_starter_quotas(formation)
        current_starters = [player for player in team.players if player.tier == "starter"]
        starter_ids = {player.id for player in current_starters}

        if starters_quota is not None:
            starter_counts = {
                position: sum(
                    player.position == position for player in current_starters
                )
                for position in ("DEF", "MID", "FWD")
            }
            if any(
                starter_counts[position] != starters_quota[position]
                for position in ("DEF", "MID", "FWD")
            ):
                starter_ids = set()
                for position in ("GK", "DEF", "MID", "FWD"):
                    quota = starters_quota[position]
                    candidates = sorted(
                        (player for player in team.players if player.position == position),
                        key=lambda player: (
                            player.tier != "starter",
                            player.squad_number,
                        ),
                    )
                    if len(candidates) < quota:
                        raise ValueError(
                            f"Team '{team.name}' does not have enough {position} players "
                            f"for its {formation} formation"
                        )
                    starter_ids.update(player.id for player in candidates[:quota])

        all_players: list[dict] = []
        starters: list[dict] = []
        substitutes: list[dict] = []
        reserves: list[dict] = []
        for p in team.players:
            is_starter = p.id in starter_ids
            tier = (
                "starter"
                if is_starter
                else "substitute"
                if p.tier == "starter"
                else p.tier
            )
            tactical_role = p.position
            if is_starter:
                if p.position == "GK":
                    tactical_role = "GK"
                else:
                    slots = slot_map.get(p.position) or FALLBACK_SLOTS.get(p.position, ["CM"])
                    idx = pos_counters.get(p.position, 0)
                    tactical_role = slots[idx % len(slots)]
                    pos_counters[p.position] = idx + 1

            serialized = _serialize_player(p, tactical_role=tactical_role)
            serialized["tier"] = tier
            all_players.append(serialized)

            if tier == "starter":
                starters.append(serialized)
            elif tier == "substitute":
                substitutes.append(serialized)
            else:
                reserves.append(serialized)

        data["players"] = all_players
        data["roster"] = {
            "starters": starters,
            "substitutes": substitutes,
            "reserves": reserves,
        }

    return data


@with_db_retry
async def get_all_teams(include_players: bool = True) -> list[dict]:
    engine = get_db_client()
    async with AsyncSession(engine) as db_session:
        query = select(Team).order_by(Team.name.asc())
        if include_players:
            query = query.options(selectinload(Team.players))

        teams = (await db_session.execute(query)).scalars().all()
        return [_serialize_team(t, include_players=include_players) for t in teams]


@with_db_retry
async def get_team_by_identifier(identifier: str) -> dict:
    engine = get_db_client()
    async with AsyncSession(engine) as db_session:
        query = select(Team).options(selectinload(Team.players))
        cleaned = identifier.strip()
        if cleaned.isdigit():
            query = query.where(Team.id == int(cleaned))
        elif len(cleaned) <= 5:
            query = query.where(
                (Team.short_code.ilike(cleaned)) | (Team.name.ilike(cleaned))
            )
        else:
            query = query.where(Team.name.ilike(cleaned))

        team = (await db_session.execute(query)).scalars().first()
        if not team:
            raise HTTPException(status_code=404, detail=f"Team '{identifier}' not found")
        return _serialize_team(team, include_players=True)


@with_db_retry
async def get_featured_matchup(
    home_name: str | None = None, away_name: str | None = None
) -> dict:
    teams = await get_all_teams(include_players=True)
    if len(teams) < 2:
        raise HTTPException(
            status_code=404, detail="Not enough teams seeded in the database"
        )

    home = next(
        (t for t in teams if home_name and t["name"].lower() == home_name.lower()),
        None,
    )
    away = next(
        (t for t in teams if away_name and t["name"].lower() == away_name.lower()),
        None,
    )

    # Default featured matchup: North London Cannons vs London Warriors (from teams_roster_data.py)
    if not home:
        home = next(
            (t for t in teams if t["short_code"] == "NLC"),
            teams[0],
        )
    if not away or away["id"] == home["id"]:
        away = next(
            (t for t in teams if t["short_code"] == "LDW" and t["id"] != home["id"]),
            next(t for t in teams if t["id"] != home["id"]),
        )

    return {
        "status": "success",
        "home_team": home,
        "away_team": away,
    }