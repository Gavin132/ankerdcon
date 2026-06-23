from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.dependencies import get_current_user
from app.models.meal import CreateMealRequest, Meal, RsvpRequest
import app.services.discord_service as discord_service
from app.core.database import supabase

router = APIRouter(prefix="/meals", tags=["meals"])

@router.get("/", response_model=list[Meal])
def list_meals(_: str = Depends(get_current_user)) -> list[Meal]:
    response = supabase.table("meals").select("*").execute()
    return response.data


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_meal(
    body: CreateMealRequest,
    background_tasks: BackgroundTasks,
    _: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> None:
    # Insert new meal into Supabase
    meal_data = {
        "meal_name": body.meal_name,
        "time": body.time,
        "location": body.location,
        "cost": body.cost,
        "transport_needed": body.transport_needed,
        "participants": [] # Initialize with empty array
    }
    supabase.table("meals").insert(meal_data).execute()

    # Discord Notification
    transport_note = " 🚗 Transport needed!" if body.transport_needed else ""
    background_tasks.add_task(
        discord_service.send_notification,
        settings.discord_webhook_url,
        settings.app_url,
        "🍽️ New Meal Added",
        f"**{body.meal_name}** at {body.time}.{transport_note}",
    )


@router.post("/{meal_id}/rsvp", status_code=status.HTTP_204_NO_CONTENT)
def rsvp(
    meal_id: str,
    body: RsvpRequest,
    _: str = Depends(get_current_user),
) -> None:
    # 1. Fetch current participants
    meal = supabase.table("meals").select("participants").eq("id", meal_id).single().execute()
    if not meal.data:
        raise HTTPException(status_code=404, detail="Meal not found")
    
    participants = meal.data.get("participants") or []
    
    # 2. Add user if not already in list
    if body.user_name not in participants:
        participants.append(body.user_name)
        supabase.table("meals").update({"participants": participants}).eq("id", meal_id).execute()


@router.post("/{meal_id}/cancel-rsvp", status_code=status.HTTP_204_NO_CONTENT)
def cancel_rsvp(
    meal_id: str,
    body: RsvpRequest,
    _: str = Depends(get_current_user),
) -> None:
    # 1. Fetch current participants
    meal = supabase.table("meals").select("participants").eq("id", meal_id).single().execute()
    if not meal.data:
        raise HTTPException(status_code=404, detail="Meal not found")
    
    participants = meal.data.get("participants") or []
    
    # 2. Remove user if in list
    if body.user_name in participants:
        participants.remove(body.user_name)
        supabase.table("meals").update({"participants": participants}).eq("id", meal_id).execute()


@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(
    meal_id: str,
    _: str = Depends(get_current_user),
) -> None:
    supabase.table("meals").delete().eq("id", meal_id).execute()