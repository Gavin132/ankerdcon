from fastapi import APIRouter, Depends, HTTPException, status

from app.constants import Tables
from app.core.logging import get_logger
from app.dependencies import get_current_user
from app.models.badge import Badge
from app.routes import BadgeRoutes
from app.core.database import supabase

logger = get_logger(__name__)
router = APIRouter(prefix=BadgeRoutes.PREFIX, tags=["badges"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."


@router.get(BadgeRoutes.LIST, response_model=list[Badge])
def list_badges(_: str = Depends(get_current_user)) -> list[Badge]:
    try:
        return supabase.table(Tables.BADGES).select("*").order("display_order").execute().data
    except Exception as e:
        logger.error("Failed to list badges: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
