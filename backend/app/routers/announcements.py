from fastapi import APIRouter, Depends, HTTPException, status

from app.constants import Tables
from app.core.logging import get_logger
from app.dependencies import get_current_user
from app.models.announcement import Announcement
from app.routes import AnnouncementRoutes
from app.core.database import supabase

logger = get_logger(__name__)
router = APIRouter(prefix=AnnouncementRoutes.PREFIX, tags=["announcements"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."


@router.get(AnnouncementRoutes.ACTIVE, response_model=list[Announcement])
def list_active_announcements(_: str = Depends(get_current_user)) -> list[Announcement]:
    try:
        return (
            supabase.table(Tables.ANNOUNCEMENTS)
            .select("*")
            .eq("active", True)
            .order("created_at", desc=True)
            .execute()
            .data
        )
    except Exception as e:
        logger.error("Failed to list active announcements: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
