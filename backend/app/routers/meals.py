from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.constants import Tables
from app.dependencies import get_current_user
from app.models.meal import CreateMealRequest, Meal, RsvpRequest
import app.services.discord_service as discord_service
from app.core.database import supabase

router = APIRouter(prefix="/meals", tags=["meals"])


@router.get("/", response_model=list[Meal])
def list_meals(_: str = Depends(get_current_user)) -> list[Meal]:
    return supabase.table(Tables.MEALS).select("*").execute().data


@router.post("/", status_code=status.HTTP_201_CREATED)
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
    supabase.table(Tables.MEALS).insert(meal_data).execute()

    background_tasks.add_task(
        discord_service.notify_meal_created,
        settings.discord_webhook_url,
        settings.app_url,
        meal_name=body.meal_name,
        time=body.time,
        location=body.location or None,
        cost=float(body.cost) if body.cost else None,
        transport_needed=body.transport_needed,
    )


@router.post("/{meal_id}/rsvp", status_code=status.HTTP_204_NO_CONTENT)
def rsvp(meal_id: str, body: RsvpRequest, _: str = Depends(get_current_user)) -> None:
    meal = supabase.table(Tables.MEALS).select("participants").eq("id", meal_id).single().execute()
    if not meal.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maaltijd niet gevonden.")

    participants = meal.data.get("participants") or []
    if body.user_name not in participants:
        participants.append(body.user_name)
        supabase.table(Tables.MEALS).update({"participants": participants}).eq("id", meal_id).execute()


@router.post("/{meal_id}/cancel-rsvp", status_code=status.HTTP_204_NO_CONTENT)
def cancel_rsvp(meal_id: str, body: RsvpRequest, _: str = Depends(get_current_user)) -> None:
    meal = supabase.table(Tables.MEALS).select("participants").eq("id", meal_id).single().execute()
    if not meal.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maaltijd niet gevonden.")

    participants = meal.data.get("participants") or []
    if body.user_name in participants:
        participants.remove(body.user_name)
        supabase.table(Tables.MEALS).update({"participants": participants}).eq("id", meal_id).execute()


@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(meal_id: str, _: str = Depends(get_current_user)) -> None:
    supabase.table(Tables.MEALS).delete().eq("id", meal_id).execute()
