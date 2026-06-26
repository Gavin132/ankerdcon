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

    # Integrations
    discord_webhook_url: str = ""
    discord_bot_token: str = ""
    app_url: str = ""

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
