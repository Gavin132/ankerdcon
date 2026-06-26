from fastapi import APIRouter, Depends, HTTPException, status

from app.constants import Tables
from app.dependencies import get_admin_user
from app.models.admin import (
    AdminCreateCalendarEventRequest,
    AdminCreateMealRequest,
    AdminUpdateCalendarEventRequest,
    AdminUpdateMealRequest,
    AdminUpdateRideRequest,
    AdminUpdateUserRequest,
)
from app.models.calendar import CalendarEvent
from app.models.meal import Meal
from app.models.rides import CreateRideRequest, Ride
from app.models.user import User
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


@router.put("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_update_user(
    user_id: str,
    body: AdminUpdateUserRequest,
    _: str = Depends(get_admin_user),
) -> None:
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return
    resp = supabase.table(Tables.PROFILES).update(updates).eq("id", user_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_user(user_id: str, _: str = Depends(get_admin_user)) -> None:
    resp = supabase.table(Tables.PROFILES).delete().eq("id", user_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")


# ── Rides ──────────────────────────────────────────────────────────────────────

@router.get("/rides", response_model=list[Ride])
def admin_list_rides(_: str = Depends(get_admin_user)) -> list[Ride]:
    return supabase.table(Tables.RIDES).select("*").order("departure_time").execute().data


@router.post("/rides", response_model=Ride, status_code=status.HTTP_201_CREATED)
def admin_create_ride(body: CreateRideRequest, _: str = Depends(get_admin_user)) -> Ride:
    new_ride = body.model_dump()
    new_ride["passengers"] = []
    new_ride["restaurant_drivers"] = []
    resp = supabase.table(Tables.RIDES).insert(new_ride).execute()
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
    body: AdminCreateCalendarEventRequest, _: str = Depends(get_admin_user)
) -> CalendarEvent:
    event_data = {k: v for k, v in body.model_dump().items() if v is not None}
    event_data.setdefault("is_hotel", False)
    event_data["participants"] = []
    resp = supabase.table(Tables.CALENDAR).insert(event_data).execute()
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
