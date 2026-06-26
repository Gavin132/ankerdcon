from fastapi import APIRouter, Depends

from app.constants import Tables
from app.dependencies import get_current_user
from app.models.badge import Badge
from app.core.database import supabase

router = APIRouter(prefix="/badges", tags=["badges"])


@router.get("/", response_model=list[Badge])
def list_badges(_: str = Depends(get_current_user)) -> list[Badge]:
    return supabase.table(Tables.BADGES).select("*").order("display_order").execute().data
