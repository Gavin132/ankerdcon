"""JWT token creation and verification."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import Settings

_SUBJECT = "ankerd_con"


def create_access_token(settings: Settings) -> str:
    return _create_token(
        {"sub": _SUBJECT, "type": "access"},
        settings.jwt_secret_key,
        timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(settings: Settings) -> str:
    return _create_token(
        {"sub": _SUBJECT, "type": "refresh"},
        settings.jwt_secret_key,
        timedelta(days=settings.refresh_token_expire_days),
    )


def verify_access_token(token: str, settings: Settings) -> bool:
    return _verify_token(token, settings.jwt_secret_key, expected_type="access")


def verify_refresh_token(token: str, settings: Settings) -> bool:
    return _verify_token(token, settings.jwt_secret_key, expected_type="refresh")


def _create_token(data: dict, secret: str, expires_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(payload, secret, algorithm="HS256")


def _verify_token(token: str, secret: str, expected_type: str) -> bool:
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload.get("sub") == _SUBJECT and payload.get("type") == expected_type
    except JWTError:
        return False
