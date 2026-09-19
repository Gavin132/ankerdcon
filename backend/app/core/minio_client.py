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


def _public_base() -> str:
    settings = get_settings()
    scheme = "https" if settings.minio_secure else "http"
    return f"{scheme}://{settings.minio_endpoint}/{settings.minio_bucket}/"


def upload_bytes(key: str, content: bytes, content_type: str) -> str:
    """Upload a file to the bucket and return its public URL.

    Every uploaded image lives in this one bucket, a folder per kind: story
    photos under <event>/<day>/, and cosplay/, event-covers/, badges/ and
    banners/ — so one read-only policy covers all of them.
    """
    settings = get_settings()
    client = _client()
    client.put_object(
        settings.minio_bucket,
        key,
        BytesIO(content),
        length=len(content),
        content_type=content_type,
    )
    return f"{_public_base()}{key}"


def key_from_url(url: str | None) -> str | None:
    """The object key behind a URL upload_bytes returned, or None when the URL
    points somewhere else (an older Supabase Storage file, a pasted link)."""
    if not url or not get_settings().minio_endpoint:
        return None
    base = _public_base()
    if not url.startswith(base):
        return None
    return url[len(base):].split("?", 1)[0] or None


def delete_object(key: str) -> None:
    settings = get_settings()
    _client().remove_object(settings.minio_bucket, key)


def get_object_bytes(key: str) -> tuple[bytes, str]:
    """Fetch an object's raw bytes + content type — used for the forced
    "download" endpoint, which streams through the backend so it works
    regardless of the bucket's CORS configuration."""
    settings = get_settings()
    response = _client().get_object(settings.minio_bucket, key)
    try:
        content = response.read()
        content_type = response.headers.get("content-type", "application/octet-stream")
        return content, content_type
    finally:
        response.close()
        response.release_conn()
