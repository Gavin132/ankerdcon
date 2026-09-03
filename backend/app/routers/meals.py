from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.constants import Tables
from app.core.logging import get_logger
from app.dependencies import get_current_user
from app.models.meal import CreateMealRequest, Meal, RsvpRequest
from app.routes import MealRoutes
from app.services import notification_service
from app import messages as M
from app.core.database import supabase

logger = get_logger(__name__)
router = APIRouter(prefix=MealRoutes.PREFIX, tags=["meals"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."


@router.get(MealRoutes.LIST, response_model=list[Meal])
def list_meals(_: str = Depends(get_current_user)) -> list[Meal]:
    try:
        return supabase.table(Tables.MEALS).select("*").execute().data
    except Exception as e:
        logger.error("Failed to list meals: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(MealRoutes.LIST, status_code=status.HTTP_201_CREATED)
def create_meal(
    body: CreateMealRequest,
    background_tasks: BackgroundTasks,
    _: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> None:
    meal_data = {
        "meal_name": body.meal_name,
        "time": body.time,
        "location": body.location,
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
    try:
        supabase.table(Tables.MEALS).insert(meal_data).execute()
    except Exception as e:
        logger.error("Failed to create meal: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    background_tasks.add_task(
        notification_service.broadcast_category_dm,
        settings.discord_bot_token,
        notification_service.NotificationCategory.MEAL_CREATED,
        M.DM_MEAL_CREATED.format(
            meal_name=body.meal_name,
            time=body.time,
            location_line=f"\n📍 {body.location}" if body.location else "",
        ),
    )


@router.post(MealRoutes.RSVP, status_code=status.HTTP_204_NO_CONTENT)
def rsvp(meal_id: str, body: RsvpRequest, _: str = Depends(get_current_user)) -> None:
    try:
        meal = supabase.table(Tables.MEALS).select("participants").eq("id", meal_id).single().execute()
    except Exception as e:
        logger.error("Failed to fetch meal %s for RSVP: %s", meal_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not meal.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maaltijd niet gevonden.")

    participants = meal.data.get("participants") or []
    if body.user_name not in participants:
        participants.append(body.user_name)
        try:
            supabase.table(Tables.MEALS).update({"participants": participants}).eq("id", meal_id).execute()
        except Exception as e:
            logger.error("Failed to update participants for meal %s: %s", meal_id, e)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(MealRoutes.CANCEL_RSVP, status_code=status.HTTP_204_NO_CONTENT)
def cancel_rsvp(meal_id: str, body: RsvpRequest, _: str = Depends(get_current_user)) -> None:
    try:
        meal = supabase.table(Tables.MEALS).select("participants").eq("id", meal_id).single().execute()
    except Exception as e:
        logger.error("Failed to fetch meal %s for cancel RSVP: %s", meal_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not meal.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maaltijd niet gevonden.")

    participants = meal.data.get("participants") or []
    if body.user_name in participants:
        participants.remove(body.user_name)
        try:
            supabase.table(Tables.MEALS).update({"participants": participants}).eq("id", meal_id).execute()
        except Exception as e:
            logger.error("Failed to update participants for meal %s: %s", meal_id, e)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.delete(MealRoutes.DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(meal_id: str, _: str = Depends(get_current_user)) -> None:
    try:
        supabase.table(Tables.MEALS).delete().eq("id", meal_id).execute()
    except Exception as e:
        logger.error("Failed to delete meal %s: %s", meal_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
