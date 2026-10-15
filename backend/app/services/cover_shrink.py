"""Shrinking the event covers that were uploaded before covers were resized on upload.

New covers are stored at up to 1600 px of WebP (admin_upload_image); this is for the ones already there,
which may be several megabytes straight from a camera. Run by hand (`python -m scripts.shrink_event_covers`),
safe to run again: a cover that is light enough is left alone.

A cover's file is cached by the browser as immutable, so a smaller version has to be a new file with a new
URL: the event is pointed at it, and the old file is only removed when asked to.
"""
from __future__ import annotations

import uuid

from app.config import get_settings
from app.constants import Tables
from app.core import minio_client
from app.core.database import supabase
from app.core.logging import get_logger
from app.core.uploads import shrink_image

logger = get_logger(__name__)

COVER_MAX_SIDE = 1600
_FOLDER = "event-covers/"


def _key_of(url: str) -> str:
    return url.split(f"/{get_settings().minio_bucket}/", 1)[-1]


def shrink_covers(*, dry_run: bool = False, delete_old: bool = False) -> list[dict]:
    """One entry per cover that was (or, in a dry run, would be) shrunk: event, old and new size in bytes."""
    events = supabase.table(Tables.EVENTS).select("id, event_name, image_url").execute().data or []
    done: list[dict] = []
    for event in events:
        url = event.get("image_url")
        if not url or f"/{get_settings().minio_bucket}/{_FOLDER}" not in url:
            continue  # no cover, or one that lives somewhere else
        old_key = _key_of(url)
        try:
            content, _ = minio_client.get_object_bytes(old_key)
            shrunk = shrink_image(content, max_side=COVER_MAX_SIDE)
            if shrunk is None:
                continue
            data, content_type, ext = shrunk
            entry = {"event": event["event_name"], "before": len(content), "after": len(data)}
            if not dry_run:
                new_url = minio_client.upload_bytes(f"{_FOLDER}{uuid.uuid4().hex}.{ext}", data, content_type)
                supabase.table(Tables.EVENTS).update({"image_url": new_url}).eq("id", event["id"]).execute()
                if delete_old:
                    minio_client.delete_object(old_key)
            done.append(entry)
        except Exception as e:
            logger.error("Cover of %s could not be shrunk: %s", event.get("event_name"), e)
    return done
