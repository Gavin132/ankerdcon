from __future__ import annotations

from functools import lru_cache
from io import BytesIO

from minio import Minio

from app.config import get_settings


@lru_cache
def _client() -> Minio:
    """Lazily constructed (and cached) — unlike the Supabase client, this
    must NOT fail at import time. MinIO is an optional, self-hosted piece
    that may not be configured yet; every other route in the app has to
    keep working while it isn't. It only raises once something actually
    tries to upload a photo."""
    settings = get_settings()
    if not settings.minio_endpoint or not settings.minio_access_key or not settings.minio_secret_key:
        raise RuntimeError(
            "MINIO_ENDPOINT / MINIO_ACCESS_KEY / MINIO_SECRET_KEY must be set in .env "
            "before photo uploads can work."
        )
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )


def upload_bytes(key: str, content: bytes, content_type: str) -> str:
    """Upload a file to the story-photos bucket and return its public URL."""
    settings = get_settings()
    client = _client()
    client.put_object(
        settings.minio_bucket,
        key,
        BytesIO(content),
        length=len(content),
        content_type=content_type,
    )
    scheme = "https" if settings.minio_secure else "http"
    return f"{scheme}://{settings.minio_endpoint}/{settings.minio_bucket}/{key}"


def delete_object(key: str) -> None:
    settings = get_settings()
    _client().remove_object(settings.minio_bucket, key)
