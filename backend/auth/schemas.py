from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from .store import Role


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)


class UserOut(BaseModel):
    id: int
    username: str
    role: Role


class SessionOut(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int = Field(description="Seconds until the access token expires")
    user: UserOut


class TicketOut(BaseModel):
    ticket: str
    expires_in: int
