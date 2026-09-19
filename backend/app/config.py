from __future__ import annotations

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # silently ignore unknown keys from .env (e.g. legacy vars)
    )

    # Supabase
    supabase_url: str = ""
    supabase_secret_key: str = ""
    supabase_jwt_secret: str = ""

    # Integrations
    discord_webhook_url: str = ""
    discord_bot_token: str = ""
    app_url: str = ""
    # Secret in the calendar subscription link. Empty = derived from
    # SUPABASE_JWT_SECRET; set it explicitly to invalidate every existing link.
    calendar_feed_token: str = ""

    # MinIO (self-hosted, S3-compatible) — event-day photo stories
    minio_endpoint: str = ""
    minio_access_key: str = ""
    minio_secret_key: str = ""
    minio_bucket: str = "story-photos"
    minio_secure: bool = True

    # Interactive API docs at /api/docs. Off unless asked for: they map out
    # every endpoint for whoever finds them.
    api_docs_enabled: bool = False

    # Requests per minute from one client (by IP) before the API answers 429.
    # Writes (anything but GET) get a quarter of this.
    rate_limit_per_minute: int = 600

    # CORS — comma-separated string in .env, or a list when set programmatically
    cors_origins: list[str] = ["http://localhost:5173"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, v: str | list) -> list[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
