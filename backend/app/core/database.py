from __future__ import annotations

from supabase import Client, create_client

from app.config import get_settings


def _create_client() -> Client:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_secret_key:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env"
        )
    return create_client(settings.supabase_url, settings.supabase_secret_key)


supabase: Client = _create_client()
