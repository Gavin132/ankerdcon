from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from app.config import Settings, get_settings
from app.constants import Tables
from app.core.atomic import update_list
from app.core.logging import get_logger
from app.core.meal_categories import default_category_id, list_meals_with_category, require_category
from app.dependencies import act_for_anyone, get_current_user, require_owner_or_admin
from app.models.meal import CreateMealRequest, Meal, RsvpRequest, UpdateMealRequest
from app.routes import MealRoutes
from app.services import notification_service
from app.services.discord_bot import escape_markdown
from app.services.geocoding_service import resolve_location
from app import messages as M
from app.core.database import supabase

logger = get_logger(__name__)
router = APIRouter(prefix=MealRoutes.PREFIX, tags=["meals"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."


@router.get(MealRoutes.LIST, response_model=list[Meal])
def list_meals(_: str = Depends(get_current_user)) -> list[Meal]:
    try:
        return list_meals_with_category()
    except Exception as e:
        logger.error("Failed to list meals: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(MealRoutes.LIST, status_code=status.HTTP_201_CREATED)
async def create_meal(
    body: CreateMealRequest,
    background_tasks: BackgroundTasks,
    current_user: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> None:
    # These handlers are `async` for the geocoding await, so every database call in them goes
    # through the thread pool: called directly, a slow query would freeze the whole server.
    if body.category_id:
        await run_in_threadpool(require_category, body.category_id)
    coords = await resolve_location(body.location, body.maps_url)
    meal_data = {
        "created_by": current_user,
        "meal_name": body.meal_name,
        "time": body.time,
        "location": body.location,
        "location_lat": coords[0] if coords else None,
        "location_lng": coords[1] if coords else None,
        "maps_url": body.maps_url,
        "cost": float(body.cost) if body.cost else 0.0,
        "transport_needed": body.transport_needed,
        "participants": [],
        "linked_event_id": body.linked_event_id,
        "website": body.website,
        "menu_url": body.menu_url,
        "description": body.description,
        "dietary_options": body.dietary_options,
        "parking_info": body.parking_info,
        "extra_notes": body.extra_notes,
    }
    category_id = body.category_id or await run_in_threadpool(default_category_id)
    if category_id:
        meal_data["category_id"] = category_id
    try:
        await run_in_threadpool(lambda: supabase.table(Tables.MEALS).insert(meal_data).execute())
    except Exception as e:
        logger.error("Failed to create meal: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    background_tasks.add_task(
        notification_service.broadcast_category_dm,
        settings.discord_bot_token,
        notification_service.NotificationCategory.MEAL_CREATED,
        M.DM_MEAL_CREATED.format(
            meal_name=escape_markdown(body.meal_name),
            time=escape_markdown(body.time),
            location_line=f"\n📍 {escape_markdown(body.location)}" if body.location else "",
        ),
    )


@router.post(MealRoutes.RSVP, status_code=status.HTTP_204_NO_CONTENT)
def rsvp(meal_id: str, body: RsvpRequest, current_user: str = Depends(get_current_user)) -> None:
    user_name = act_for_anyone(current_user, body.user_name, adding=True)
    update_list(
        Tables.MEALS, meal_id, "participants",
        lambda names, _row: None if user_name in names else names + [user_name],
        not_found="Maaltijd niet gevonden.",
    )


@router.post(MealRoutes.CANCEL_RSVP, status_code=status.HTTP_204_NO_CONTENT)
def cancel_rsvp(meal_id: str, body: RsvpRequest, current_user: str = Depends(get_current_user)) -> None:
    user_name = act_for_anyone(current_user, body.user_name)
    update_list(
        Tables.MEALS, meal_id, "participants",
        lambda names, _row: [n for n in names if n != user_name] if user_name in names else None,
        not_found="Maaltijd niet gevonden.",
    )


_UPDATE_NULLABLE_FIELDS = {
    "linked_event_id", "website", "menu_url", "maps_url",
    "description", "dietary_options", "parking_info", "extra_notes",
}


async def _resolve_meal_update_coords(meal_id: str, updates: dict) -> None:
    """Re-resolves location_lat/location_lng into `updates` when either the
    location text or its Maps-link override changed — using the new value for
    whichever one did, and the row's current value (one more read) for
    whichever one didn't, so combining a *new* location with a *stale*
    maps_url (or the reverse) can't resolve the wrong spot or wrongly null
    out an otherwise-still-valid pin. Mirrors admin.py's
    `_resolve_update_coords`, kept local here rather than imported so this
    member-facing router doesn't depend on the admin one."""
    if "location" not in updates and "maps_url" not in updates:
        return
    location = updates.get("location")
    maps_url = updates.get("maps_url")
    if "location" not in updates or "maps_url" not in updates:
        try:
            rows = (await run_in_threadpool(lambda: supabase.table(Tables.MEALS).select("location, maps_url").eq("id", meal_id).execute())).data
        except Exception as e:
            logger.error("Failed to fetch current location/maps_url for meal %s: %s", meal_id, e)
            rows = []
        current = rows[0] if rows else {}
        if "location" not in updates:
            location = current.get("location")
        if "maps_url" not in updates:
            maps_url = current.get("maps_url")
    coords = await resolve_location(location, maps_url)
    updates["location_lat"], updates["location_lng"] = coords if coords else (None, None)


@router.put(MealRoutes.DETAIL, status_code=status.HTTP_204_NO_CONTENT)
async def update_meal(
    meal_id: str,
    body: UpdateMealRequest,
    current_user: str = Depends(get_current_user),
) -> None:
    """Let whoever created a meal — or an admin — correct it afterwards."""
    try:
        row = await run_in_threadpool(lambda: supabase.table(Tables.MEALS).select("created_by").eq("id", meal_id).execute())
    except Exception as e:
        logger.error("Failed to fetch meal %s for update: %s", meal_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maaltijd niet gevonden.")
    require_owner_or_admin(
        current_user,
        row.data[0].get("created_by"),
        "Alleen wie deze maaltijd heeft aangemaakt, of een admin, kan hem bewerken.",
    )

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    for field in _UPDATE_NULLABLE_FIELDS:
        if field in body.model_fields_set:
            updates[field] = getattr(body, field)
    if not updates:
        return
    if updates.get("category_id"):
        await run_in_threadpool(require_category, updates["category_id"])
    await _resolve_meal_update_coords(meal_id, updates)

    try:
        resp = await run_in_threadpool(lambda: supabase.table(Tables.MEALS).update(updates).eq("id", meal_id).execute())
    except Exception as e:
        logger.error("Failed to update meal %s: %s", meal_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maaltijd niet gevonden.")


@router.delete(MealRoutes.DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(meal_id: str, current_user: str = Depends(get_current_user)) -> None:
    try:
        row = supabase.table(Tables.MEALS).select("created_by").eq("id", meal_id).execute()
    except Exception as e:
        logger.error("Failed to fetch meal %s for delete: %s", meal_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maaltijd niet gevonden.")
    require_owner_or_admin(
        current_user,
        row.data[0].get("created_by"),
        "Alleen wie deze maaltijd heeft aangemaakt, of een admin, kan hem verwijderen.",
    )

    # The ride to a restaurant only exists for that meal; left behind, it would lose its
    # meal and hang around unseen with people still signed up for it.
    try:
        supabase.table(Tables.RIDES).delete().eq("direction", "Restaurant").eq("linked_meal_id", meal_id).execute()
        supabase.table(Tables.MEALS).delete().eq("id", meal_id).execute()
    except Exception as e:
        logger.error("Failed to delete meal %s: %s", meal_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
