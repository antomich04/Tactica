import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

@dataclass(frozen=True)
class AuthSettings:
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-secret")
    access_ttl: int = int(os.getenv("ACCESS_TOKEN_TTL_SECONDS", "300"))
    refresh_ttl: int = int(os.getenv("REFRESH_TOKEN_TTL_SECONDS", "604800"))
    ws_ticket_ttl: int = int(os.getenv("WS_TICKET_TTL_SECONDS", "30"))

auth_settings = AuthSettings()