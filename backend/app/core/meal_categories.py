"""Looking up meal categories from the places that save a meal."""
from __future__ import annotations

from typing import Optional

from fastapi import HTTPException, status

from app.constants import Tables
from app.core.database import supabase
from app.core.logging import get_logger

logger = get_logger(__name__)

_DB_ERROR = "Databasefout. Probeer het opnieuw."


_EMBED = "*, category:meal_categories(id, name, sort_order, has_signup, has_cost, has_transport, is_meal)"


def list_meals_with_category() -> list[dict]:
    """Every meal, each with its category row embedded as `category`. Falls back to
    plain rows when the embed fails (the categories migration has not run yet), so
    the meals themselves never depend on it."""
    try:
        return supabase.table(Tables.MEALS).select(_EMBED).execute().data
    except Exception as e:
        logger.warning("Listing meals with their category failed, falling back to plain rows: %s", e)
        return supabase.table(Tables.MEALS).select("*").execute().data


def require_category(category_id: str) -> None:
    """400 when the category does not exist, so a typo or a deleted category is
    answered clearly instead of by a foreign-key error."""
    try:
        rows = supabase.table(Tables.MEAL_CATEGORIES).select("id").eq("id", category_id).execute().data
    except Exception as e:
        logger.error("Failed to look up meal category %s: %s", category_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Deze categorie bestaat niet (meer). Kies een andere.")


def default_category_id() -> Optional[str]:
    """The category a new item gets when none is given: the first one, which is
    Eten unless an admin reordered them. None when there are no categories (or the
    table does not exist yet), in which case the item is saved without one."""
    try:
        rows = (
            supabase.table(Tables.MEAL_CATEGORIES)
            .select("id")
            .order("sort_order")
            .order("name")
            .limit(1)
            .execute()
            .data
        )
    except Exception as e:
        logger.warning("Could not pick a default meal category: %s", e)
        return None
    return rows[0]["id"] if rows else None
