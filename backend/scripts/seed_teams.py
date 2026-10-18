import asyncio
import config.env as env
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from config.database_client import get_db_client
from models.User import Base
from models.Team import Team, Player
from backend.scripts.teams_roster_data import TEAMS_DATA


def generate_crest_svg(short_code: str, primary: str, secondary: str) -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120">
      <defs>
        <linearGradient id="grad_{short_code}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="{primary}" />
          <stop offset="100%" stop-color="{secondary}" />
        </linearGradient>
      </defs>
      <!-- Shield Base -->
      <path d="M50 2 L95 15 L90 70 C90 95 50 115 50 115 C50 115 10 95 10 70 L5 15 Z" 
            fill="url(#grad_{short_code})" stroke="{secondary}" stroke-width="4" />
      <!-- Inner Accent Ring -->
      <path d="M50 10 L85 20 L81 65 C81 85 50 102 50 102 C50 102 19 85 19 65 L15 20 Z" 
            fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.6" />
      <!-- Club Short Code -->
      <text x="50" y="65" font-family="Arial, sans-serif" font-weight="900" font-size="22" 
            fill="{secondary}" text-anchor="middle" letter-spacing="2">{short_code}</text>
    </svg>"""


def parse_formation_starters(formation: str) -> dict[str, int]:
    parts = [int(x) for x in formation.split("-")]
    return {
        "GK": 1,
        "DEF": parts[0],
        "MID": sum(parts[1:-1]),
        "FWD": parts[-1],
    }


async def seed_database() -> None:
    engine = get_db_client()

    async with engine.begin() as conn:
        await conn.execute(text("DROP TABLE IF EXISTS players CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS teams CASCADE"))
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession(engine) as session:
        total_players = 0
        for club in TEAMS_DATA:
            starters_quota = parse_formation_starters(club["formation"])
            used_starters = {"GK": 0, "DEF": 0, "MID": 0, "FWD": 0}

            # Standard 9 substitutes allocation: 1 GK, 2 DEF, 3 MID, 3 FWD
            subs_quota = {"GK": 1, "DEF": 2, "MID": 3, "FWD": 3}
            used_subs = {"GK": 0, "DEF": 0, "MID": 0, "FWD": 0}

            svg_badge = generate_crest_svg(club["short_code"], club["primary_color"], club["secondary_color"])

            team = Team(
                name=club["name"],
                short_code=club["short_code"],
                primary_color=club["primary_color"],
                secondary_color=club["secondary_color"],
                formation=club["formation"],
                tactical_style=club["tactical_style"],
                stadium_name=club["stadium_name"],
                badge_svg=svg_badge,
            )

            for squad_num, player_name, pos, nationality in club["roster"]:
                if used_starters[pos] < starters_quota[pos]:
                    tier = "starter"
                    used_starters[pos] += 1
                elif used_subs[pos] < subs_quota[pos]:
                    tier = "substitute"
                    used_subs[pos] += 1
                else:
                    tier = "reserve"

                is_starter = (tier == "starter")

                team.players.append(
                    Player(
                        name=player_name,
                        squad_number=squad_num,
                        position=pos,
                        nationality=nationality,
                        tier=tier,
                    )
                )
                total_players += 1

            session.add(team)

        await session.commit()
        print(f"Successfully seeded {len(TEAMS_DATA)} Premier League clubs, vector badges, and {total_players} tri-tier players into tacticadb!")


if __name__ == "__main__":
    asyncio.run(seed_database())