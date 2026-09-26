from __future__ import annotations

import uuid
from collections import defaultdict

from fastapi.concurrency import run_in_threadpool
from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status

from app.config import get_settings
from app.constants import Tables
from app.core import minio_client
from app.core.database import supabase
from app.core.logging import get_logger
from app.core.uploads import clean_image, read_capped
from app.dependencies import get_current_user
from app.models.story import MarkStorySeenRequest, StoryDaySummary, StoryPhoto, StorySeenState, UserStoryPhoto
from app.routes import StoryRoutes

logger = get_logger(__name__)
router = APIRouter(prefix=StoryRoutes.PREFIX, tags=["stories"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."

# Compression already happens client-side before upload — this cap is a
# safety net (a broken/bypassed client, not the expected path), not the
# normal ceiling.
_MAX_BYTES = 15 * 1024 * 1024  # 15 MB
_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


def _require_day_id(event_day_id: str) -> None:
    """A client-side bug (or a request crafted by hand) can end up calling
    these routes with an empty event_day_id — e.g. `//seen` — which would
    otherwise reach Supabase as a malformed filter and surface as an opaque
    503/500 instead of a clear 422."""
    if not event_day_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="event_day_id ontbreekt.")


# Registered before the LIST/{event_day_id} route below — FastAPI matches
# routes in registration order, not by specificity, so this literal
# `/summary` path has to come first or `/{event_day_id}` (a single-segment
# wildcard) shadows it, binding event_day_id to the literal string
# "summary" and failing with "invalid input syntax for type uuid: summary".
@router.get(StoryRoutes.SUMMARY, response_model=dict[str, StoryDaySummary])
def get_story_summary(
    event_day_ids: str = Query(..., description="Comma-separated event_day ids"),
    current_user: str = Depends(get_current_user),
):
    day_ids = [d for d in event_day_ids.split(",") if d]
    if not day_ids:
        return {}

    try:
        photos = (
            supabase.table(Tables.STORY_PHOTOS)
            .select("event_day_id, seq, image_url")
            .in_("event_day_id", day_ids)
            .execute()
            .data
        )
        seen_rows = (
            supabase.table(Tables.STORY_SEEN)
            .select("event_day_id, last_seen_seq")
            .eq("user_name", current_user)
            .in_("event_day_id", day_ids)
            .execute()
            .data
        )
    except Exception as e:
        logger.error("Failed to build story summary for %s: %s", current_user, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    # PostgREST has no server-side GROUP BY through the table query builder,
    # so counts/max(seq)/the newest photo's url are aggregated here — fine
    # at this app's scale (a handful of days, at most a few hundred photos
    # total).
    by_day: dict[str, list[dict]] = defaultdict(list)
    for p in photos:
        by_day[p["event_day_id"]].append(p)

    seen_by_day = {r["event_day_id"]: r["last_seen_seq"] for r in seen_rows}

    result: dict[str, StoryDaySummary] = {}
    for day_id, day_photos in by_day.items():
        newest = max(day_photos, key=lambda p: p["seq"])
        last_seen = seen_by_day.get(day_id, 0)
        result[day_id] = StoryDaySummary(
            photo_count=len(day_photos),
            latest_seq=newest["seq"],
            has_unseen=newest["seq"] > last_seen,
            preview_url=newest["image_url"],
        )
    return result


# Also before LIST/{event_day_id} for the same reason as /summary.
@router.get(StoryRoutes.BY_USER, response_model=list[UserStoryPhoto])
def list_user_photos(identifier: str, _: str = Depends(get_current_user)):
    """Every photo a member has put in a story, newest first, each with the
    event it belongs to — for their profile. `identifier` is their id or name."""
    try:
        try:
            uuid.UUID(identifier)
            by = "id"
        except ValueError:
            by = "name"
        profiles = supabase.table(Tables.PROFILES).select("id, name, aliases").execute().data or []
    except Exception as e:
        logger.error("Failed to load profiles for photos of %s: %s", identifier, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    profile = next((p for p in profiles if p[by] == identifier), None)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")

    # Photos carry the name the uploader had at the time, so a former name
    # (alias) still counts — unless somebody else goes by it now.
    current_names = {p["name"] for p in profiles}
    names = [profile["name"]] + [a for a in (profile.get("aliases") or []) if a not in current_names]

    try:
        photos = (
            supabase.table(Tables.STORY_PHOTOS)
            .select("id, image_url, created_at, event_day_id")
            .in_("uploaded_by", names)
            .order("created_at", desc=True)
            .execute()
            .data
            or []
        )
        day_ids = list({p["event_day_id"] for p in photos})
        days = (
            supabase.table(Tables.EVENT_DAYS).select("id, event_id, date").in_("id", day_ids).execute().data
            if day_ids else []
        ) or []
        event_ids = list({d["event_id"] for d in days if d.get("event_id")})
        events = (
            supabase.table(Tables.EVENTS).select("id, event_name").in_("id", event_ids).execute().data
            if event_ids else []
        ) or []
    except Exception as e:
        logger.error("Failed to list photos of %s: %s", identifier, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    day_by_id = {d["id"]: d for d in days}
    name_by_event = {e["id"]: e["event_name"] for e in events}
    out: list[UserStoryPhoto] = []
    for p in photos:
        day = day_by_id.get(p["event_day_id"], {})
        event_id = day.get("event_id")
        out.append(UserStoryPhoto(
            id=p["id"], image_url=p["image_url"], created_at=p["created_at"], event_day_id=p["event_day_id"],
            event_id=event_id, event_name=name_by_event.get(event_id), date=day.get("date"),
        ))
    return out


@router.get(StoryRoutes.LIST, response_model=list[StoryPhoto])
def list_story_photos(event_day_id: str, _: str = Depends(get_current_user)):
    _require_day_id(event_day_id)
    try:
        return (
            supabase.table(Tables.STORY_PHOTOS)
            .select("*")
            .eq("event_day_id", event_day_id)
            .order("seq")
            .execute()
            .data
        )
    except Exception as e:
        logger.error("Failed to list story photos for day %s: %s", event_day_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


def _store_story_photo(event_day_id: str, current_user: str, content: bytes) -> dict:
    content, content_type, ext = clean_image(content, {"JPEG", "PNG", "WEBP"})

    # Nest under the parent event too (not just the day) so MinIO's own
    # browser groups a multi-day con's photos together instead of scattering
    # them across same-looking sibling "folders".
    try:
        day_row = (
            supabase.table(Tables.EVENT_DAYS)
            .select("event_id")
            .eq("id", event_day_id)
            .execute()
        )
    except Exception as e:
        logger.error("Failed to look up event for day %s: %s", event_day_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not day_row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evenementdag niet gevonden.")
    event_id = day_row.data[0]["event_id"]

    key = f"{event_id}/{event_day_id}/{uuid.uuid4().hex}.{ext}"

    try:
        image_url = minio_client.upload_bytes(key, content, content_type)
    except RuntimeError as e:
        # MinIO not configured yet — a clear message instead of a generic 503.
        logger.error("Story photo upload failed (MinIO not configured): %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.error("MinIO upload failed for day %s: %s", event_day_id, e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Uploaden mislukt. Probeer het opnieuw.",
        )

    try:
        resp = (
            supabase.table(Tables.STORY_PHOTOS)
            .insert({
                "event_day_id": event_day_id,
                "uploaded_by": current_user,
                "image_url": image_url,
            })
            .execute()
        )
        return resp.data[0]
    except Exception as e:
        logger.error("Failed to save story photo row for day %s: %s", event_day_id, e)
        # The file is already in MinIO at this point but the DB insert failed —
        # best-effort cleanup so it isn't orphaned.
        try:
            minio_client.delete_object(key)
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(StoryRoutes.LIST, status_code=status.HTTP_201_CREATED, response_model=StoryPhoto)
async def upload_story_photo(
    event_day_id: str,
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user),
):
    _require_day_id(event_day_id)
    if file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Bestandstype niet toegestaan. Gebruik JPG, PNG of WebP.",
        )

    content = await read_capped(file, _MAX_BYTES)
    return await run_in_threadpool(_store_story_photo, event_day_id, current_user, content)


@router.delete(StoryRoutes.DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def delete_story_photo(photo_id: str, current_user: str = Depends(get_current_user)):
    try:
        row = supabase.table(Tables.STORY_PHOTOS).select("*").eq("id", photo_id).execute()
    except Exception as e:
        logger.error("Failed to fetch story photo %s: %s", photo_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not row.data:
        return
    if row.data[0]["uploaded_by"] != current_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Je kan alleen je eigen foto's verwijderen.",
        )

    try:
        supabase.table(Tables.STORY_PHOTOS).delete().eq("id", photo_id).execute()
    except Exception as e:
        logger.error("Failed to delete story photo %s: %s", photo_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    # Best-effort storage cleanup — derive the object key from the stored URL's
    # path (everything after the bucket name), same non-fatal pattern as the
    # banner upload's old-file cleanup.
    try:
        settings = get_settings()
        key = row.data[0]["image_url"].split(f"/{settings.minio_bucket}/", 1)[-1]
        minio_client.delete_object(key)
    except Exception:
        pass


@router.get(StoryRoutes.DOWNLOAD)
def download_story_photo(photo_id: str, _: str = Depends(get_current_user)):
    """Streams the original photo bytes through the backend with a
    Content-Disposition header, so the browser is forced to download it
    rather than open it — a direct link to the bucket can't guarantee that,
    and would also need the bucket's CORS configured just to read the bytes
    client-side."""
    try:
        row = supabase.table(Tables.STORY_PHOTOS).select("*").eq("id", photo_id).execute()
    except Exception as e:
        logger.error("Failed to fetch story photo %s: %s", photo_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foto niet gevonden.")

    photo = row.data[0]
    settings = get_settings()
    key = photo["image_url"].split(f"/{settings.minio_bucket}/", 1)[-1]

    try:
        content, content_type = minio_client.get_object_bytes(key)
    except Exception as e:
        logger.error("Failed to fetch story photo bytes for %s: %s", photo_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Downloaden mislukt. Probeer het opnieuw.")

    ext = _EXT.get(content_type, "jpg")
    filename = f"story-{photo['created_at'][:10]}-{photo_id[:8]}.{ext}"
    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(StoryRoutes.SEEN, response_model=StorySeenState)
def get_story_seen(event_day_id: str, current_user: str = Depends(get_current_user)):
    _require_day_id(event_day_id)
    try:
        resp = (
            supabase.table(Tables.STORY_SEEN)
            .select("last_seen_seq")
            .eq("user_name", current_user)
            .eq("event_day_id", event_day_id)
            .execute()
        )
    except Exception as e:
        logger.error("Failed to fetch story-seen state for %s/%s: %s", current_user, event_day_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    last_seen_seq = resp.data[0]["last_seen_seq"] if resp.data else 0
    return {"event_day_id": event_day_id, "last_seen_seq": last_seen_seq}


@router.put(StoryRoutes.SEEN, status_code=status.HTTP_204_NO_CONTENT)
def mark_story_seen(
    event_day_id: str,
    body: MarkStorySeenRequest,
    current_user: str = Depends(get_current_user),
):
    _require_day_id(event_day_id)
    try:
        existing = (
            supabase.table(Tables.STORY_SEEN)
            .select("last_seen_seq")
            .eq("user_name", current_user)
            .eq("event_day_id", event_day_id)
            .execute()
        )
        current_max = existing.data[0]["last_seen_seq"] if existing.data else 0
        # Never let the watermark move backwards — an out-of-order or
        # duplicate call (e.g. two viewer tabs) shouldn't un-mark photos
        # as unseen.
        new_seq = max(current_max, body.seq)
        supabase.table(Tables.STORY_SEEN).upsert({
            "user_name": current_user,
            "event_day_id": event_day_id,
            "last_seen_seq": new_seq,
        }).execute()
    except Exception as e:
        logger.error("Failed to mark story seen for %s/%s: %s", current_user, event_day_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


