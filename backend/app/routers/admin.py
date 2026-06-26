from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.constants import Tables
from app.dependencies import get_admin_user
from app.models.admin import (
    AdminCreateCalendarEventRequest,
    AdminCreateMealRequest,
    AdminCreateUserRequest,
    AdminUpdateCalendarEventRequest,
    AdminUpdateMealRequest,
    AdminUpdateRideRequest,
    AdminUpdateUserRequest,
)
from app.models.badge import Badge, BadgeOrderItem, CreateBadgeRequest, UpdateBadgeRequest
from app.models.calendar import CalendarEvent
from app.models.meal import Meal
from app.models.rides import CreateRideRequest, Ride
from app.models.user import User
import app.services.discord_service as discord_service
from app.services import discord_bot
from app.core.database import supabase

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Stats ──────────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(_: str = Depends(get_admin_user)) -> dict:
    users  = supabase.table(Tables.PROFILES).select("id").execute()
    rides  = supabase.table(Tables.RIDES).select("id").execute()
    meals  = supabase.table(Tables.MEALS).select("id").execute()
    events = supabase.table(Tables.CALENDAR).select("id").execute()
    return {
        "users":  len(users.data),
        "rides":  len(rides.data),
        "meals":  len(meals.data),
        "events": len(events.data),
    }


# ── Users ──────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[User])
def admin_list_users(_: str = Depends(get_admin_user)) -> list[User]:
    resp = supabase.table(Tables.PROFILES).select("*").order("name").execute()
    users = []
    for user in resp.data:
        user.pop("passcode", None)
        users.append(user)
    return users


@router.post("/users", response_model=User, status_code=status.HTTP_201_CREATED)
def admin_create_user(body: AdminCreateUserRequest, _: str = Depends(get_admin_user)) -> User:
    """Create a stub profile to allowlist a new user before they log in with Discord."""
    data: dict = {"name": body.name, "is_admin": body.is_admin, "is_active": True}
    if body.discord_id:
        data["discord_id"] = body.discord_id
    resp = supabase.table(Tables.PROFILES).insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kon gebruiker niet aanmaken.")
    return resp.data[0]


@router.put("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_update_user(
    user_id: str,
    body: AdminUpdateUserRequest,
    _: str = Depends(get_admin_user),
    settings: Settings = Depends(get_settings),
) -> None:
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return

    # Fetch current state before updating so we can detect is_active transitions
    current = supabase.table(Tables.PROFILES).select("discord_id, is_active, allow_dm").eq("id", user_id).execute()
    if not current.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")
    row = current.data[0]

    resp = supabase.table(Tables.PROFILES).update(updates).eq("id", user_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")

    # Send deactivation DM if is_active is being switched off
    if (
        body.is_active is False
        and row.get("is_active") is not False   # was active before
        and row.get("allow_dm", True)
        and row.get("discord_id")
    ):
        discord_bot.send_deactivated_dm(settings.discord_bot_token, row["discord_id"])


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_user(
    user_id: str,
    _: str = Depends(get_admin_user),
    settings: Settings = Depends(get_settings),
) -> None:
    # Fetch discord_id + consent before deletion so we can DM them
    current = supabase.table(Tables.PROFILES).select("discord_id, allow_dm").eq("id", user_id).execute()
    if not current.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")
    row = current.data[0]

    supabase.table(Tables.PROFILES).delete().eq("id", user_id).execute()

    if row.get("allow_dm", True) and row.get("discord_id"):
        discord_bot.send_removed_dm(settings.discord_bot_token, row["discord_id"])


# ── Rides ──────────────────────────────────────────────────────────────────────

@router.get("/rides", response_model=list[Ride])
def admin_list_rides(_: str = Depends(get_admin_user)) -> list[Ride]:
    return supabase.table(Tables.RIDES).select("*").order("departure_time").execute().data


@router.post("/rides", response_model=Ride, status_code=status.HTTP_201_CREATED)
def admin_create_ride(
    body: CreateRideRequest,
    background_tasks: BackgroundTasks,
    _: str = Depends(get_admin_user),
    settings: Settings = Depends(get_settings),
) -> Ride:
    new_ride = body.model_dump()
    new_ride["passengers"] = []
    new_ride["restaurant_drivers"] = []
    resp = supabase.table(Tables.RIDES).insert(new_ride).execute()

    background_tasks.add_task(
        discord_service.notify_ride_created,
        settings.discord_webhook_url,
        settings.app_url,
        direction=body.direction,
        driver=body.driver,
        vehicle_type=body.vehicle_type,
        departure_time=body.departure_time,
        start_location=body.start_location,
        total_seats=body.total_seats,
        is_public_transport=(body.vehicle_type == "Public Transport"),
        parking_info=body.parking_info or None,
        maps_link=body.maps_link or None,
        action_required=body.action_required,
    )
    return resp.data[0]


@router.put("/rides/{ride_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_update_ride(
    ride_id: str,
    body: AdminUpdateRideRequest,
    _: str = Depends(get_admin_user),
) -> None:
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return
    resp = supabase.table(Tables.RIDES).update(updates).eq("id", ride_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rit niet gevonden.")


@router.delete("/rides/{ride_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_ride(ride_id: str, _: str = Depends(get_admin_user)) -> None:
    supabase.table(Tables.RIDES).delete().eq("id", ride_id).execute()


@router.delete("/rides/{ride_id}/passengers/{passenger}", status_code=status.HTTP_204_NO_CONTENT)
def admin_remove_passenger(ride_id: str, passenger: str, _: str = Depends(get_admin_user)) -> None:
    resp = supabase.table(Tables.RIDES).select("passengers").eq("id", ride_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rit niet gevonden.")
    passengers = [p for p in (resp.data[0].get("passengers") or []) if p != passenger]
    supabase.table(Tables.RIDES).update({"passengers": passengers}).eq("id", ride_id).execute()


# ── Meals ──────────────────────────────────────────────────────────────────────

@router.get("/meals", response_model=list[Meal])
def admin_list_meals(_: str = Depends(get_admin_user)) -> list[Meal]:
    return supabase.table(Tables.MEALS).select("*").execute().data


@router.post("/meals", response_model=Meal, status_code=status.HTTP_201_CREATED)
def admin_create_meal(body: AdminCreateMealRequest, _: str = Depends(get_admin_user)) -> Meal:
    meal_data = body.model_dump()
    meal_data["participants"] = []
    resp = supabase.table(Tables.MEALS).insert(meal_data).execute()
    return resp.data[0]


@router.put("/meals/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_update_meal(
    meal_id: str,
    body: AdminUpdateMealRequest,
    _: str = Depends(get_admin_user),
) -> None:
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return
    resp = supabase.table(Tables.MEALS).update(updates).eq("id", meal_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maaltijd niet gevonden.")


@router.delete("/meals/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_meal(meal_id: str, _: str = Depends(get_admin_user)) -> None:
    supabase.table(Tables.MEALS).delete().eq("id", meal_id).execute()


@router.delete("/meals/{meal_id}/participants/{participant}", status_code=status.HTTP_204_NO_CONTENT)
def admin_remove_meal_participant(
    meal_id: str, participant: str, _: str = Depends(get_admin_user)
) -> None:
    resp = supabase.table(Tables.MEALS).select("participants").eq("id", meal_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maaltijd niet gevonden.")
    participants = [p for p in (resp.data[0].get("participants") or []) if p != participant]
    supabase.table(Tables.MEALS).update({"participants": participants}).eq("id", meal_id).execute()


# ── Calendar Events ────────────────────────────────────────────────────────────

@router.get("/calendar", response_model=list[CalendarEvent])
def admin_list_events(_: str = Depends(get_admin_user)) -> list[CalendarEvent]:
    return supabase.table(Tables.CALENDAR).select("*").order("date").execute().data


@router.post("/calendar", response_model=CalendarEvent, status_code=status.HTTP_201_CREATED)
def admin_create_event(
    body: AdminCreateCalendarEventRequest,
    background_tasks: BackgroundTasks,
    _: str = Depends(get_admin_user),
    settings: Settings = Depends(get_settings),
) -> CalendarEvent:
    event_data = {k: v for k, v in body.model_dump().items() if v is not None}
    event_data.setdefault("is_hotel", False)
    event_data["participants"] = []
    resp = supabase.table(Tables.CALENDAR).insert(event_data).execute()

    background_tasks.add_task(
        discord_service.notify_event_created,
        settings.discord_webhook_url,
        settings.app_url,
        event_name=body.event_name,
        date=body.date,
        description=body.description,
        location=body.location,
        website=body.website,
        ticket_url=body.ticket_url,
        ticket_sale_start=body.ticket_sale_start,
        ticket_types=body.ticket_types,
        locker_info=body.locker_info,
        parking_info=body.parking_info,
        what_to_bring=body.what_to_bring,
        special_instructions=body.special_instructions,
    )
    if body.ticket_sale_start:
        background_tasks.add_task(
            discord_service.notify_ticket_sale_opening,
            settings.discord_webhook_url,
            settings.app_url,
            event_name=body.event_name,
            date=body.date,
            ticket_sale_start=body.ticket_sale_start,
            ticket_url=body.ticket_url,
            ticket_types=body.ticket_types,
        )

    return resp.data[0]


@router.put("/calendar/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_update_event(
    event_id: str,
    body: AdminUpdateCalendarEventRequest,
    _: str = Depends(get_admin_user),
) -> None:
    updates = {k: v for k, v in body.model_dump().items() if v is not None or k == "ticket_types"}
    updates = {k: v for k, v in updates.items() if v is not None}
    if not updates:
        return
    resp = supabase.table(Tables.CALENDAR).update(updates).eq("id", event_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evenement niet gevonden.")


@router.delete("/calendar/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_event(event_id: str, _: str = Depends(get_admin_user)) -> None:
    supabase.table(Tables.CALENDAR).delete().eq("id", event_id).execute()


@router.delete("/calendar/{event_id}/participants/{participant}", status_code=status.HTTP_204_NO_CONTENT)
def admin_remove_event_participant(
    event_id: str, participant: str, _: str = Depends(get_admin_user)
) -> None:
    resp = supabase.table(Tables.CALENDAR).select("participants").eq("id", event_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evenement niet gevonden.")
    participants = [p for p in (resp.data[0].get("participants") or []) if p != participant]
    supabase.table(Tables.CALENDAR).update({"participants": participants}).eq("id", event_id).execute()


# ── Badges ─────────────────────────────────────────────────────────────────────

@router.get("/badges", response_model=list[Badge])
def admin_list_badges(_: str = Depends(get_admin_user)) -> list[Badge]:
    return supabase.table(Tables.BADGES).select("*").order("display_order").execute().data


@router.patch("/badges/reorder", status_code=status.HTTP_204_NO_CONTENT)
def admin_reorder_badges(body: list[BadgeOrderItem], _: str = Depends(get_admin_user)) -> None:
    for item in body:
        supabase.table(Tables.BADGES).update({"display_order": item.display_order}).eq("id", item.id).execute()


@router.post("/badges", response_model=Badge, status_code=status.HTTP_201_CREATED)
def admin_create_badge(body: CreateBadgeRequest, _: str = Depends(get_admin_user)) -> Badge:
    resp = supabase.table(Tables.BADGES).insert(body.model_dump()).execute()
    return resp.data[0]


@router.put("/badges/{badge_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_update_badge(
    badge_id: str, body: UpdateBadgeRequest, _: str = Depends(get_admin_user)
) -> None:
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return
    resp = supabase.table(Tables.BADGES).update(updates).eq("id", badge_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Badge niet gevonden.")


@router.delete("/badges/{badge_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_badge(badge_id: str, _: str = Depends(get_admin_user)) -> None:
    # Remove this badge_id from all users before deleting
    users = supabase.table(Tables.PROFILES).select("id, badge_ids").execute().data
    for user in users:
        ids = user.get("badge_ids") or []
        if badge_id in ids:
            supabase.table(Tables.PROFILES).update(
                {"badge_ids": [b for b in ids if b != badge_id]}
            ).eq("id", user["id"]).execute()
    supabase.table(Tables.BADGES).delete().eq("id", badge_id).execute()


@router.post("/users/{user_id}/badges/{badge_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_assign_badge(user_id: str, badge_id: str, _: str = Depends(get_admin_user)) -> None:
    resp = supabase.table(Tables.PROFILES).select("badge_ids").eq("id", user_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")
    ids: list[str] = resp.data[0].get("badge_ids") or []
    if badge_id not in ids:
        supabase.table(Tables.PROFILES).update({"badge_ids": ids + [badge_id]}).eq("id", user_id).execute()


@router.delete("/users/{user_id}/badges/{badge_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_unassign_badge(user_id: str, badge_id: str, _: str = Depends(get_admin_user)) -> None:
    resp = supabase.table(Tables.PROFILES).select("badge_ids").eq("id", user_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")
    ids: list[str] = resp.data[0].get("badge_ids") or []
    supabase.table(Tables.PROFILES).update({"badge_ids": [b for b in ids if b != badge_id]}).eq("id", user_id).execute()
