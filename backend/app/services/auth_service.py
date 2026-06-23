"""Authentication business logic — per-user passcode validation and token issuance."""

from __future__ import annotations

import gspread

from app.config import Settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
import app.services.sheets_service as sheets_service


def authenticate(user_name: str, passcode: str, spreadsheet: gspread.Spreadsheet) -> bool:
    """Return True if the passcode matches the user's stored passcode."""
    return sheets_service.check_passcode(spreadsheet, user_name, passcode)


def issue_tokens(settings: Settings, user_name: str) -> dict[str, str]:
    """Return a fresh access + refresh token pair for the given user."""
    return {
        "access_token": create_access_token(settings, user_name),
        "refresh_token": create_refresh_token(settings, user_name),
    }


def refresh_access_token(refresh_token: str, settings: Settings) -> str:
    """Validate a refresh token and return a new access token for the same user."""
    user_name = decode_refresh_token(refresh_token, settings)
    if not user_name:
        raise ValueError("Invalid or expired refresh token")
    return create_access_token(settings, user_name)
