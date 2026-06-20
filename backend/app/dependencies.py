"""FastAPI dependency providers shared across routers."""

from __future__ import annotations

import gspread
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings
from app.core.security import verify_access_token
from app.core.sheets import get_spreadsheet

_bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    settings: Settings = Depends(get_settings),
) -> str:
    """Validate the Bearer token and return the subject claim."""
    if not verify_access_token(credentials.credentials, settings):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return "ankerd_con"


def get_sheets(settings: Settings = Depends(get_settings)) -> gspread.Spreadsheet:
    """Return the cached gspread Spreadsheet instance."""
    return get_spreadsheet(settings)
