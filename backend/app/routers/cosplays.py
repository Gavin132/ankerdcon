from fastapi import APIRouter, Depends, HTTPException, status

from app.constants import Tables
from app.core.database import supabase
from app.core.logging import get_logger
from app.dependencies import get_current_user
from app.models.cosplay import Cosplay, CreateCosplayRequest
from app.routes import CosplayRoutes

logger = get_logger(__name__)
router = APIRouter(prefix=CosplayRoutes.PREFIX, tags=["cosplays"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."


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
def create_cosplay(body: CreateCosplayRequest, _: str = Depends(get_current_user)):
    if not body.linked_event_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Selecteer minimaal één dag.",
        )
    try:
        resp = supabase.table(Tables.COSPLAYS).insert(body.model_dump()).execute()
        return resp.data[0]
    except Exception as e:
        logger.error("Failed to create cosplay: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.delete(CosplayRoutes.DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def delete_cosplay(cosplay_id: str, _: str = Depends(get_current_user)):
    try:
        supabase.table(Tables.COSPLAYS).delete().eq("id", cosplay_id).execute()
    except Exception as e:
        logger.error("Failed to delete cosplay %s: %s", cosplay_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
