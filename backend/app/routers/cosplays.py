import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.constants import Tables
from app.core import minio_client
from app.core.database import supabase
from app.core.logging import get_logger
from app.core.uploads import clean_image, read_capped
from app.dependencies import act_as, get_current_user, require_owner_or_admin
from app.models.cosplay import Cosplay, CreateCosplayRequest
from app.routes import CosplayRoutes

logger = get_logger(__name__)
router = APIRouter(prefix=CosplayRoutes.PREFIX, tags=["cosplays"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."

# Compression already happens client-side before upload, same as the story
# uploader — this cap is a safety net (a broken/bypassed client, not the
# normal path), not the normal ceiling.
_MAX_BYTES = 15 * 1024 * 1024  # 15 MB
_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.get(CosplayRoutes.LIST, response_model=list[Cosplay])
def list_cosplays(_: str = Depends(get_current_user)):
    try:
        return (
            supabase.table(Tables.COSPLAYS)
            .select("*")
            .order("created_at", desc=True)
            .execute()
            .data
        )
    except Exception as e:
        logger.error("Failed to list cosplays: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(CosplayRoutes.LIST, status_code=status.HTTP_201_CREATED, response_model=Cosplay)
def create_cosplay(body: CreateCosplayRequest, current_user: str = Depends(get_current_user)):
    if not body.linked_event_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Selecteer minimaal één dag.",
        )
    row = {**body.model_dump(), "user_name": act_as(current_user, body.user_name)}
    try:
        resp = supabase.table(Tables.COSPLAYS).insert(row).execute()
        return resp.data[0]
    except Exception as e:
        logger.error("Failed to create cosplay: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(CosplayRoutes.IMAGE, response_model=dict)
async def upload_cosplay_image(file: UploadFile = File(...), _: str = Depends(get_current_user)):
    if file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Bestandstype niet toegestaan. Gebruik JPG, PNG of WebP.",
        )

    content = await read_capped(file, _MAX_BYTES)
    content, content_type, ext = clean_image(content, {"JPEG", "PNG", "WEBP"})
    key = f"cosplay/{uuid.uuid4().hex}.{ext}"

    try:
        image_url = minio_client.upload_bytes(key, content, content_type)
    except RuntimeError as e:
        logger.error("Cosplay image upload failed (MinIO not configured): %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.error("MinIO upload failed for a cosplay image: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Uploaden mislukt. Probeer het opnieuw.",
        )

    return {"url": image_url}


@router.delete(CosplayRoutes.DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def delete_cosplay(cosplay_id: str, current_user: str = Depends(get_current_user)):
    try:
        row = supabase.table(Tables.COSPLAYS).select("user_name").eq("id", cosplay_id).execute()
    except Exception as e:
        logger.error("Failed to fetch cosplay %s for delete: %s", cosplay_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cosplay niet gevonden.")
    require_owner_or_admin(
        current_user,
        row.data[0].get("user_name"),
        "Je kunt alleen je eigen cosplays verwijderen.",
    )

    try:
        supabase.table(Tables.COSPLAYS).delete().eq("id", cosplay_id).execute()
    except Exception as e:
        logger.error("Failed to delete cosplay %s: %s", cosplay_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
