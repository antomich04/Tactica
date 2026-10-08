from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import store
from .config import get_settings
from .dependencies import current_principal, websocket_principal
from .router import router as _auth_router

__all__ = ["setup_auth", "current_principal", "websocket_principal"]


def setup_auth(app: FastAPI) -> None:
    settings = get_settings()  # fails fast at startup if the configuration is unsafe
    store.init_db()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=True,  # needed for the refresh cookie
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    )
    app.include_router(_auth_router)
