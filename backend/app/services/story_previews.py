"""Making the lighter copies (thumbnail, preview) for story photos that were added before they existed.

The upload route makes them for every new photo; this is for the ones already in the bucket. It is run by
hand (`python -m scripts.backfill_story_previews`) after migration v2.41, and can be run again: it only
touches photos that have no thumbnail yet.
"""
from __future__ import annotations

from app.config import get_settings
from app.constants import Tables
from app.core import minio_client
from app.core.database import supabase
from app.core.logging import get_logger
from app.core.thumbnails import PREVIEW_SUFFIX, THUMB_SUFFIX, make_derivatives
from app.models.story import media_type_of

logger = get_logger(__name__)


def _key_of(url: str) -> str:
    return url.split(f"/{get_settings().minio_bucket}/", 1)[-1]


def make_for_row(row: dict) -> dict | None:
    """Make and store the thumbnail (and preview) of one `story_photos` row and return the columns to
    set on it, or None when there is nothing to make it from (a video that has no poster)."""
    is_video = media_type_of(row["image_url"]) == "video"
    source_url = row.get("poster_url") if is_video else row["image_url"]
    if not source_url:
        return None
    source_key = _key_of(source_url)
    content, _ = minio_client.get_object_bytes(source_key)
    thumb, preview = make_derivatives(content, preview=not is_video)

    base = _key_of(row["image_url"]).rsplit(".", 1)[0]
    update = {"thumb_url": minio_client.upload_bytes(f"{base}{THUMB_SUFFIX}", thumb, "image/webp")}
    if preview is not None:
        update["preview_url"] = minio_client.upload_bytes(f"{base}{PREVIEW_SUFFIX}", preview, "image/webp")
    return update


def backfill(limit: int | None = None) -> tuple[int, int, int]:
    """(made, skipped, failed) over the photos without a thumbnail, at most `limit` of them."""
    rows = supabase.table(Tables.STORY_PHOTOS).select("*").is_("thumb_url", "null").order("created_at").execute().data or []
    made = skipped = failed = 0
    for row in rows[:limit]:
        try:
            update = make_for_row(row)
            if update is None:
                skipped += 1
                continue
            supabase.table(Tables.STORY_PHOTOS).update(update).eq("id", row["id"]).execute()
            made += 1
        except Exception as e:
            failed += 1
            logger.error("Backfill: photo %s failed: %s", row.get("id"), e)
    return made, skipped, failed
