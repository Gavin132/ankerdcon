"""Authentication business logic — passphrase validation and token issuance."""

from __future__ import annotations

from app.config import Settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
)


def authenticate(passphrase: str, settings: Settings) -> bool:
    """Return True if the passphrase matches the configured secret."""
    return passphrase == settings.app_passphrase


def issue_tokens(settings: Settings) -> dict[str, str]:
    """Return a fresh access + refresh token pair."""
    return {
        "access_token": create_access_token(settings),
        "refresh_token": create_refresh_token(settings),
    }


def refresh_access_token(refresh_token: str, settings: Settings) -> str:
    """Validate a refresh token and return a new access token."""
    if not verify_refresh_token(refresh_token, settings):
        raise ValueError("Invalid or expired refresh token")
    return create_access_token(settings)
