from fastapi import APIRouter, Depends, HTTPException, status

from app.constants import Tables
from app.core.database import supabase
from app.core.logging import get_logger
from app.dependencies import get_current_user
from app.models.meal_category import MealCategory
from app.routes import MealCategoryRoutes

logger = get_logger(__name__)
router = APIRouter(prefix=MealCategoryRoutes.PREFIX, tags=["meal-categories"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."


@router.get(MealCategoryRoutes.LIST, response_model=list[MealCategory])
def list_meal_categories(_: str = Depends(get_current_user)) -> list[MealCategory]:
    """The kinds of activity a member can pick when planning one. Managed by admins."""
    try:
        return supabase.table(Tables.MEAL_CATEGORIES).select("*").order("sort_order").order("name").execute().data
    except Exception as e:
        logger.error("Failed to list meal categories: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
