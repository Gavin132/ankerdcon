from fastapi import APIRouter, Depends, HTTPException, status

from app.constants import Tables
from app.core.logging import get_logger
from app.dependencies import get_current_user
from app.models.changelog import ChangelogEntry
from app.routes import ChangelogRoutes
from app.core.database import supabase

logger = get_logger(__name__)
router = APIRouter(prefix=ChangelogRoutes.PREFIX, tags=["changelog"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."


@router.get(ChangelogRoutes.LIST, response_model=list[ChangelogEntry])
def list_changelog_entries(_: str = Depends(get_current_user)) -> list[ChangelogEntry]:
    try:
        return (
            supabase.table(Tables.CHANGELOG_ENTRIES)
            .select("*")
            .order("released_at", desc=True)
            .order("created_at", desc=True)
            .execute()
            .data
        )
    except Exception as e:
        logger.error("Failed to list changelog entries: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
