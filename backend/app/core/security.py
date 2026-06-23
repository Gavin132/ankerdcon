"""JWT token creation and verification."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import Settings


def create_access_token(settings: Settings, user_name: str) -> str:
    return _create_token(
        {"sub": user_name, "type": "access"},
        settings.jwt_secret_key,
        timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(settings: Settings, user_name: str) -> str:
    return _create_token(
        {"sub": user_name, "type": "refresh"},
        settings.jwt_secret_key,
        timedelta(days=settings.refresh_token_expire_days),
    )


def decode_access_token(token: str, settings: Settings) -> str | None:
    """Verify access token and return the user_name (sub claim), or None."""
    return _decode(token, settings.jwt_secret_key, expected_type="access")


def decode_refresh_token(token: str, settings: Settings) -> str | None:
    """Verify refresh token and return the user_name (sub claim), or None."""
    return _decode(token, settings.jwt_secret_key, expected_type="refresh")


def _decode(token: str, secret: str, expected_type: str) -> str | None:
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        if payload.get("type") != expected_type:
            return None
        sub = payload.get("sub")
        return str(sub) if sub else None
    except JWTError:
        return None


def _create_token(data: dict, secret: str, expires_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(payload, secret, algorithm="HS256")
