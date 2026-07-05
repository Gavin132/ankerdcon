from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.constants import Tables
from app.core.logging import get_logger
from app.dependencies import get_admin_user
from app.models.admin import (
    AdminCreateCalendarEventRequest,
    AdminCreateMealRequest,
    AdminCreateUserRequest,
    AdminUpdateCalendarEventRequest,
    AdminUpdateHotelRoomRequest,
    AdminUpdateMealRequest,
    AdminUpdateRideRequest,
    AdminUpdateUserRequest,
    BulkDeleteEventsRequest,
    BulkDeleteUsersRequest,
    BulkDeactivateUsersRequest,
    BulkDeleteRidesRequest,
    BulkDeleteMealsRequest,
    BulkDeleteEventGroupsRequest,
    BulkGroupEventsRequest,
    BulkRsvpRequest,
    BulkSetEventGroupRequest,
    EventGroup,
    CreateEventGroupRequest,
    SetEventGroupRequest,
    UpdateEventGroupRequest,
)
from app.models.badge import Badge, BadgeOrderItem, CreateBadgeRequest, UpdateBadgeRequest
from app.models.calendar import CalendarEvent, HotelRoom
from app.routers.calendar import _hotel_group_key
from app.models.meal import Meal
from app.models.rides import CreateRideRequest, Ride
from app.models.user import User
from app.routes import AdminRoutes
import app.services.discord_service as discord_service
from app.services import discord_bot
from app.core.database import supabase

logger = get_logger(__name__)
router = APIRouter(prefix=AdminRoutes.PREFIX, tags=["admin"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."


def _build_updates(body, nullable_fields: set[str] | None = None) -> dict:
    """Build a partial-update dict.

    Fields set to ``None`` are normally excluded so they don't accidentally
    overwrite existing data.  Pass field names in *nullable_fields* to allow
    those fields to be explicitly cleared (set to NULL) when the caller
    includes them in the request body.
    """
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    for field in (nullable_fields or set()):
        if field in body.model_fields_set:
            updates[field] = getattr(body, field)
    return updates


# ── Stats ──────────────────────────────────────────────────────────────────────

@router.get(AdminRoutes.STATS)
def get_stats(_: str = Depends(get_admin_user)) -> dict:
    try:
        users  = supabase.table(Tables.PROFILES).select("id").execute()
        rides  = supabase.table(Tables.RIDES).select("id").execute()
        meals  = supabase.table(Tables.MEALS).select("id").execute()
        events = supabase.table(Tables.CALENDAR).select("id").execute()
    except Exception as e:
        logger.error("Failed to fetch admin stats: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    return {
        "users":  len(users.data),
        "rides":  len(rides.data),
        "meals":  len(meals.data),
        "events": len(events.data),
    }


# ── Users ──────────────────────────────────────────────────────────────────────

@router.get(AdminRoutes.USERS, response_model=list[User])
def admin_list_users(_: str = Depends(get_admin_user)) -> list[User]:
    try:
        resp = supabase.table(Tables.PROFILES).select("*").order("name").execute()
    except Exception as e:
        logger.error("Failed to list users: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    users = []
    for user in resp.data:
        user.pop("passcode", None)
        users.append(user)
    return users


@router.post(AdminRoutes.USERS, response_model=User, status_code=status.HTTP_201_CREATED)
def admin_create_user(body: AdminCreateUserRequest, _: str = Depends(get_admin_user)) -> User:
    """Create a stub profile to allowlist a new user before they log in with Discord."""
    data: dict = {"name": body.name, "is_admin": body.is_admin, "is_active": True, "is_first_login": True}
    if body.discord_id:
        data["discord_id"] = body.discord_id
    try:
        resp = supabase.table(Tables.PROFILES).insert(data).execute()
    except Exception as e:
        logger.error("Failed to create user %s: %s", body.name, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kon gebruiker niet aanmaken.")
    return resp.data[0]


def _remove_user_from_all_events(name: str) -> None:
    """Strip a user's name from passengers/participants arrays across all tables."""
    for table, field in [
        (Tables.RIDES, "passengers"),
        (Tables.MEALS, "participants"),
        (Tables.CALENDAR, "participants"),
    ]:
        try:
            rows = supabase.table(table).select(f"id, {field}").execute().data or []
            for row in rows:
                members: list = row.get(field) or []
                if name in members:
                    supabase.table(table).update({field: [m for m in members if m != name]}).eq("id", row["id"]).execute()
        except Exception as e:
            logger.error("Cleanup %s.%s failed for %r: %s", table, field, name, e)


@router.put(AdminRoutes.USER_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_update_user(
    user_id: str,
    body: AdminUpdateUserRequest,
    _: str = Depends(get_admin_user),
    settings: Settings = Depends(get_settings),
) -> None:
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return

    try:
        current = supabase.table(Tables.PROFILES).select("name, discord_id, is_active, allow_dm").eq("id", user_id).execute()
    except Exception as e:
        logger.error("Failed to fetch user %s for update: %s", user_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not current.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")
    row = current.data[0]

    try:
        resp = supabase.table(Tables.PROFILES).update(updates).eq("id", user_id).execute()
    except Exception as e:
        logger.error("Failed to update user %s: %s", user_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")

    # Deactivation: send DM + remove from all events
    if body.is_active is False and row.get("is_active") is not False:
        if row.get("name"):
            _remove_user_from_all_events(row["name"])
        if row.get("allow_dm", True) and row.get("discord_id"):
            try:
                discord_bot.send_deactivated_dm(settings.discord_bot_token, row["discord_id"])
            except Exception as e:
                logger.warning("Failed to send deactivation DM to %s: %s", row.get("discord_id"), e)


@router.delete(AdminRoutes.USER_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_user(
    user_id: str,
    _: str = Depends(get_admin_user),
    settings: Settings = Depends(get_settings),
) -> None:
    try:
        current = supabase.table(Tables.PROFILES).select("name, discord_id, allow_dm").eq("id", user_id).execute()
    except Exception as e:
        logger.error("Failed to fetch user %s for deletion: %s", user_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not current.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")
    row = current.data[0]

    if row.get("name"):
        _remove_user_from_all_events(row["name"])

    try:
        supabase.table(Tables.PROFILES).delete().eq("id", user_id).execute()
    except Exception as e:
        logger.error("Failed to delete user %s: %s", user_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if row.get("allow_dm", True) and row.get("discord_id"):
        try:
            discord_bot.send_removed_dm(settings.discord_bot_token, row["discord_id"])
        except Exception as e:
            logger.warning("Failed to send removal DM to %s: %s", row.get("discord_id"), e)


@router.post(AdminRoutes.USERS_BULK_DELETE, status_code=status.HTTP_204_NO_CONTENT)
def admin_bulk_delete_users(
    body: BulkDeleteUsersRequest,
    _: str = Depends(get_admin_user),
    settings: Settings = Depends(get_settings),
) -> None:
    for user_id in body.user_ids:
        try:
            current = supabase.table(Tables.PROFILES).select("name, discord_id, allow_dm").eq("id", user_id).execute()
        except Exception as e:
            logger.error("Failed to fetch user %s during bulk delete: %s", user_id, e)
            continue
        if not current.data:
            continue
        row = current.data[0]
        if row.get("name"):
            _remove_user_from_all_events(row["name"])
        try:
            supabase.table(Tables.PROFILES).delete().eq("id", user_id).execute()
        except Exception as e:
            logger.error("Failed to delete user %s during bulk delete: %s", user_id, e)
            continue
        if row.get("allow_dm", True) and row.get("discord_id"):
            try:
                discord_bot.send_removed_dm(settings.discord_bot_token, row["discord_id"])
            except Exception as e:
                logger.warning("Failed to send removal DM to %s: %s", row.get("discord_id"), e)


@router.post(AdminRoutes.USERS_BULK_DEACTIVATE, status_code=status.HTTP_204_NO_CONTENT)
def admin_bulk_deactivate_users(body: BulkDeactivateUsersRequest, _: str = Depends(get_admin_user)) -> None:
    for user_id in body.user_ids:
        try:
            supabase.table(Tables.PROFILES).update({"is_active": False}).eq("id", user_id).execute()
        except Exception as e:
            logger.error("Failed to deactivate user %s: %s", user_id, e)


# ── Rides ──────────────────────────────────────────────────────────────────────

@router.get(AdminRoutes.RIDES, response_model=list[Ride])
def admin_list_rides(_: str = Depends(get_admin_user)) -> list[Ride]:
    try:
        return supabase.table(Tables.RIDES).select("*").order("departure_time").execute().data
    except Exception as e:
        logger.error("Failed to list rides: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.RIDES, response_model=Ride, status_code=status.HTTP_201_CREATED)
def admin_create_ride(
    body: CreateRideRequest,
    background_tasks: BackgroundTasks,
    _: str = Depends(get_admin_user),
    settings: Settings = Depends(get_settings),
) -> Ride:
    new_ride = body.model_dump()
    new_ride["passengers"] = []
    new_ride["restaurant_drivers"] = []
    try:
        resp = supabase.table(Tables.RIDES).insert(new_ride).execute()
    except Exception as e:
        logger.error("Failed to create ride: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

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
        action_required=body.action_required,
    )
    return resp.data[0]


@router.put(AdminRoutes.RIDE_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_update_ride(
    ride_id: str,
    body: AdminUpdateRideRequest,
    _: str = Depends(get_admin_user),
) -> None:
    updates = _build_updates(body, nullable_fields={"linked_event_id"})
    if not updates:
        return
    try:
        resp = supabase.table(Tables.RIDES).update(updates).eq("id", ride_id).execute()
    except Exception as e:
        logger.error("Failed to update ride %s: %s", ride_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rit niet gevonden.")


@router.delete(AdminRoutes.RIDE_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_ride(ride_id: str, _: str = Depends(get_admin_user)) -> None:
    try:
        supabase.table(Tables.RIDES).delete().eq("id", ride_id).execute()
    except Exception as e:
        logger.error("Failed to delete ride %s: %s", ride_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.RIDES_BULK_DELETE, status_code=status.HTTP_204_NO_CONTENT)
def admin_bulk_delete_rides(body: BulkDeleteRidesRequest, _: str = Depends(get_admin_user)) -> None:
    for ride_id in body.ride_ids:
        try:
            supabase.table(Tables.RIDES).delete().eq("id", ride_id).execute()
        except Exception as e:
            logger.error("Failed to delete ride %s during bulk delete: %s", ride_id, e)


@router.delete(AdminRoutes.RIDE_PASSENGER, status_code=status.HTTP_204_NO_CONTENT)
def admin_remove_passenger(ride_id: str, passenger: str, _: str = Depends(get_admin_user)) -> None:
    try:
        resp = supabase.table(Tables.RIDES).select("passengers").eq("id", ride_id).execute()
    except Exception as e:
        logger.error("Failed to fetch ride %s for passenger removal: %s", ride_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rit niet gevonden.")
    passengers = [p for p in (resp.data[0].get("passengers") or []) if p != passenger]
    try:
        supabase.table(Tables.RIDES).update({"passengers": passengers}).eq("id", ride_id).execute()
    except Exception as e:
        logger.error("Failed to update passengers for ride %s: %s", ride_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


# ── Meals ──────────────────────────────────────────────────────────────────────

@router.get(AdminRoutes.MEALS, response_model=list[Meal])
def admin_list_meals(_: str = Depends(get_admin_user)) -> list[Meal]:
    try:
        return supabase.table(Tables.MEALS).select("*").execute().data
    except Exception as e:
        logger.error("Failed to list meals: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.MEALS, response_model=Meal, status_code=status.HTTP_201_CREATED)
def admin_create_meal(body: AdminCreateMealRequest, _: str = Depends(get_admin_user)) -> Meal:
    meal_data = body.model_dump()
    meal_data["participants"] = []
    try:
        resp = supabase.table(Tables.MEALS).insert(meal_data).execute()
        return resp.data[0]
    except Exception as e:
        logger.error("Failed to create meal: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.put(AdminRoutes.MEAL_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_update_meal(
    meal_id: str,
    body: AdminUpdateMealRequest,
    _: str = Depends(get_admin_user),
) -> None:
    updates = _build_updates(body, nullable_fields={"linked_event_id"})
    if not updates:
        return
    try:
        resp = supabase.table(Tables.MEALS).update(updates).eq("id", meal_id).execute()
    except Exception as e:
        logger.error("Failed to update meal %s: %s", meal_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maaltijd niet gevonden.")


@router.delete(AdminRoutes.MEAL_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_meal(meal_id: str, _: str = Depends(get_admin_user)) -> None:
    try:
        supabase.table(Tables.MEALS).delete().eq("id", meal_id).execute()
    except Exception as e:
        logger.error("Failed to delete meal %s: %s", meal_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.MEALS_BULK_DELETE, status_code=status.HTTP_204_NO_CONTENT)
def admin_bulk_delete_meals(body: BulkDeleteMealsRequest, _: str = Depends(get_admin_user)) -> None:
    for meal_id in body.meal_ids:
        try:
            supabase.table(Tables.MEALS).delete().eq("id", meal_id).execute()
        except Exception as e:
            logger.error("Failed to delete meal %s during bulk delete: %s", meal_id, e)


@router.delete(AdminRoutes.MEAL_PARTICIPANT, status_code=status.HTTP_204_NO_CONTENT)
def admin_remove_meal_participant(
    meal_id: str, participant: str, _: str = Depends(get_admin_user)
) -> None:
    try:
        resp = supabase.table(Tables.MEALS).select("participants").eq("id", meal_id).execute()
    except Exception as e:
        logger.error("Failed to fetch meal %s for participant removal: %s", meal_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maaltijd niet gevonden.")
    participants = [p for p in (resp.data[0].get("participants") or []) if p != participant]
    try:
        supabase.table(Tables.MEALS).update({"participants": participants}).eq("id", meal_id).execute()
    except Exception as e:
        logger.error("Failed to update participants for meal %s: %s", meal_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


# ── Calendar Events ────────────────────────────────────────────────────────────

@router.get(AdminRoutes.CALENDAR, response_model=list[CalendarEvent])
def admin_list_events(_: str = Depends(get_admin_user)) -> list[CalendarEvent]:
    try:
        return supabase.table(Tables.CALENDAR).select("*").order("date").execute().data
    except Exception as e:
        logger.error("Failed to list calendar events: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.CALENDAR_BULK_DELETE, status_code=status.HTTP_204_NO_CONTENT)
def admin_bulk_delete_events(body: BulkDeleteEventsRequest, _: str = Depends(get_admin_user)) -> None:
    for event_id in body.event_ids:
        try:
            supabase.table(Tables.CALENDAR).delete().eq("id", event_id).execute()
        except Exception as e:
            logger.error("Failed to delete event %s during bulk delete: %s", event_id, e)


@router.post(AdminRoutes.CALENDAR_BULK_GROUP, status_code=status.HTTP_204_NO_CONTENT)
def admin_bulk_group_events(body: BulkGroupEventsRequest, _: str = Depends(get_admin_user)) -> None:
    """Link events as a multi-day group (or ungroup by passing multi_day_id=null).
    When multi_day_id is omitted from the request, a new ID is auto-generated."""
    import uuid as _uuid
    if body.multi_day_id == "":
        mid = None  # empty string = ungroup (clear multi_day_id)
    elif body.multi_day_id is not None:
        mid = body.multi_day_id  # use provided ID
    else:
        mid = f"mdg_{_uuid.uuid4().hex[:8]}"  # auto-generate new group ID
    for event_id in body.event_ids:
        try:
            supabase.table(Tables.CALENDAR).update({"multi_day_id": mid}).eq("id", event_id).execute()
        except Exception as e:
            logger.error("Failed to set multi_day_id for event %s: %s", event_id, e)


@router.post(AdminRoutes.CALENDAR_BULK_SET_GROUP, status_code=status.HTTP_204_NO_CONTENT)
def admin_bulk_set_event_group(body: BulkSetEventGroupRequest, _: str = Depends(get_admin_user)) -> None:
    """Assign or clear the event_group_id label on multiple events."""
    for event_id in body.event_ids:
        try:
            supabase.table(Tables.CALENDAR).update({"event_group_id": body.group_id}).eq("id", event_id).execute()
        except Exception as e:
            logger.error("Failed to set event_group_id for event %s: %s", event_id, e)


@router.post(AdminRoutes.CALENDAR, response_model=CalendarEvent, status_code=status.HTTP_201_CREATED)
def admin_create_event(
    body: AdminCreateCalendarEventRequest,
    background_tasks: BackgroundTasks,
    _: str = Depends(get_admin_user),
    settings: Settings = Depends(get_settings),
) -> CalendarEvent:
    event_data = {k: v for k, v in body.model_dump().items() if v is not None and v != ""}
    event_data.setdefault("is_hotel", False)
    event_data["participants"] = []
    try:
        resp = supabase.table(Tables.CALENDAR).insert(event_data).execute()
    except Exception as e:
        logger.error("Failed to create calendar event: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

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


@router.put(AdminRoutes.CALENDAR_EVENT, status_code=status.HTTP_204_NO_CONTENT)
def admin_update_event(
    event_id: str,
    body: AdminUpdateCalendarEventRequest,
    _: str = Depends(get_admin_user),
) -> None:
    updates = {k: v for k, v in body.model_dump().items() if v is not None or k == "ticket_types"}
    updates = {k: v for k, v in updates.items() if v is not None}
    if not updates:
        return
    try:
        resp = supabase.table(Tables.CALENDAR).update(updates).eq("id", event_id).execute()
    except Exception as e:
        logger.error("Failed to update event %s: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evenement niet gevonden.")


@router.patch(AdminRoutes.CALENDAR_EVENT_GROUP, status_code=status.HTTP_204_NO_CONTENT)
def admin_set_event_group(
    event_id: str,
    body: SetEventGroupRequest,
    _: str = Depends(get_admin_user),
) -> None:
    """Assign or remove a group from a calendar event without touching other fields."""
    try:
        supabase.table(Tables.CALENDAR).update(
            {"event_group_id": body.group_id}
        ).eq("id", event_id).execute()
    except Exception as e:
        logger.error("Failed to set event group for event %s: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.delete(AdminRoutes.CALENDAR_EVENT, status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_event(event_id: str, _: str = Depends(get_admin_user)) -> None:
    try:
        supabase.table(Tables.CALENDAR).delete().eq("id", event_id).execute()
    except Exception as e:
        logger.error("Failed to delete event %s: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.get(AdminRoutes.CALENDAR_EVENT_HOTEL_ROOMS, response_model=list[HotelRoom])
def admin_list_hotel_rooms(event_id: str, _: str = Depends(get_admin_user)) -> list[HotelRoom]:
    group_key, _ = _hotel_group_key(event_id)
    try:
        return supabase.table(Tables.HOTEL_ROOMS).select("*").eq("event_id", group_key).order("room_number").execute().data
    except Exception as e:
        logger.error("Failed to list hotel rooms for event %s: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.put(AdminRoutes.CALENDAR_EVENT_HOTEL_ROOM, status_code=status.HTTP_204_NO_CONTENT)
def admin_update_hotel_room(
    event_id: str,
    room_id: str,
    body: AdminUpdateHotelRoomRequest,
    _: str = Depends(get_admin_user),
) -> None:
    updates: dict = {}
    for field, value in body.model_dump(exclude_unset=False).items():
        if field in body.model_fields_set:
            updates[field] = value
        elif value is not None:
            updates[field] = value
    if not updates:
        return
    try:
        resp = supabase.table(Tables.HOTEL_ROOMS).update(updates).eq("id", room_id).execute()
    except Exception as e:
        logger.error("Failed to update hotel room %s: %s", room_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kamer niet gevonden.")


@router.delete(AdminRoutes.CALENDAR_EVENT_HOTEL_ROOM, status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_hotel_room(
    event_id: str,
    room_id: str,
    _: str = Depends(get_admin_user),
) -> None:
    try:
        supabase.table(Tables.HOTEL_ROOMS).delete().eq("id", room_id).execute()
    except Exception as e:
        logger.error("Failed to delete hotel room %s: %s", room_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.delete(AdminRoutes.CALENDAR_EVENT_PARTICIPANT, status_code=status.HTTP_204_NO_CONTENT)
def admin_remove_event_participant(
    event_id: str, participant: str, _: str = Depends(get_admin_user)
) -> None:
    try:
        resp = supabase.table(Tables.CALENDAR).select("participants").eq("id", event_id).execute()
    except Exception as e:
        logger.error("Failed to fetch event %s for participant removal: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evenement niet gevonden.")
    participants = [p for p in (resp.data[0].get("participants") or []) if p != participant]
    try:
        supabase.table(Tables.CALENDAR).update({"participants": participants}).eq("id", event_id).execute()
    except Exception as e:
        logger.error("Failed to update participants for event %s: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.CALENDAR_EVENT_BULK_RSVP, status_code=status.HTTP_204_NO_CONTENT)
def admin_bulk_rsvp_event(event_id: str, body: BulkRsvpRequest, _: str = Depends(get_admin_user)) -> None:
    try:
        resp = supabase.table(Tables.CALENDAR).select("participants").eq("id", event_id).execute()
    except Exception as e:
        logger.error("Failed to fetch event %s for bulk RSVP: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evenement niet gevonden.")

    participants = list(resp.data[0].get("participants") or [])
    new_names = [n for n in body.user_names if n not in participants]
    if new_names:
        participants.extend(new_names)
        try:
            supabase.table(Tables.CALENDAR).update({"participants": participants}).eq("id", event_id).execute()
        except Exception as e:
            logger.error("Failed to update participants for event %s during bulk RSVP: %s", event_id, e)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.CALENDAR_EVENT_SYNC_GROUP, status_code=status.HTTP_204_NO_CONTENT)
def admin_sync_event_group(event_id: str, _: str = Depends(get_admin_user)) -> None:
    """Copy all shared detail fields from one event to every other day with the same multi_day_id."""
    try:
        resp = supabase.table(Tables.CALENDAR).select("*").eq("id", event_id).execute()
    except Exception as e:
        logger.error("Failed to fetch event %s for sync: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evenement niet gevonden.")

    event = resp.data[0]
    multi_day_id = event.get("multi_day_id")
    if not multi_day_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Evenement heeft geen meerdaagse koppeling.")

    shared = {k: v for k, v in {
        "image_url":            event.get("image_url"),
        "description":          event.get("description"),
        "location":             event.get("location"),
        "website":              event.get("website"),
        "ticket_url":           event.get("ticket_url"),
        "ticket_sale_start":    event.get("ticket_sale_start"),
        "ticket_types":         event.get("ticket_types"),
        "locker_info":          event.get("locker_info"),
        "parking_info":         event.get("parking_info"),
        "special_instructions": event.get("special_instructions"),
        "what_to_bring":        event.get("what_to_bring"),
        "is_hotel":             event.get("is_hotel"),
    }.items() if v is not None}

    try:
        supabase.table(Tables.CALENDAR).update(shared).eq("multi_day_id", multi_day_id).neq("id", event_id).execute()
    except Exception as e:
        logger.error("Failed to sync event group for event %s: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


# ── Event groups ────────────────────────────────────────────────────────────────

@router.get(AdminRoutes.EVENT_GROUPS, response_model=list[EventGroup])
def admin_list_event_groups(_: str = Depends(get_admin_user)) -> list[EventGroup]:
    try:
        return supabase.table(Tables.EVENT_GROUPS).select("*").order("name").execute().data
    except Exception as e:
        logger.error("Failed to list event groups: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.EVENT_GROUPS, response_model=EventGroup, status_code=status.HTTP_201_CREATED)
def admin_create_event_group(body: CreateEventGroupRequest, _: str = Depends(get_admin_user)) -> EventGroup:
    try:
        resp = supabase.table(Tables.EVENT_GROUPS).insert({"name": body.name}).execute()
    except Exception as e:
        logger.error("Failed to create event group %s: %s", body.name, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kon groep niet aanmaken.")
    return resp.data[0]


@router.put(AdminRoutes.EVENT_GROUP_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_update_event_group(group_id: str, body: UpdateEventGroupRequest, _: str = Depends(get_admin_user)) -> None:
    try:
        resp = supabase.table(Tables.EVENT_GROUPS).update({"name": body.name}).eq("id", group_id).execute()
    except Exception as e:
        logger.error("Failed to update event group %s: %s", group_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Groep niet gevonden.")


@router.delete(AdminRoutes.EVENT_GROUP_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_event_group(group_id: str, _: str = Depends(get_admin_user)) -> None:
    try:
        supabase.table(Tables.EVENT_GROUPS).delete().eq("id", group_id).execute()
    except Exception as e:
        logger.error("Failed to delete event group %s: %s", group_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.EVENT_GROUPS_BULK_DELETE, status_code=status.HTTP_204_NO_CONTENT)
def admin_bulk_delete_event_groups(body: BulkDeleteEventGroupsRequest, _: str = Depends(get_admin_user)) -> None:
    for group_id in body.group_ids:
        try:
            supabase.table(Tables.EVENT_GROUPS).delete().eq("id", group_id).execute()
        except Exception as e:
            logger.error("Failed to delete event group %s during bulk delete: %s", group_id, e)


# ── Badges ─────────────────────────────────────────────────────────────────────

@router.get(AdminRoutes.BADGES, response_model=list[Badge])
def admin_list_badges(_: str = Depends(get_admin_user)) -> list[Badge]:
    try:
        return supabase.table(Tables.BADGES).select("*").order("display_order").execute().data
    except Exception as e:
        logger.error("Failed to list badges: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.patch(AdminRoutes.BADGES_REORDER, status_code=status.HTTP_204_NO_CONTENT)
def admin_reorder_badges(body: list[BadgeOrderItem], _: str = Depends(get_admin_user)) -> None:
    for item in body:
        try:
            supabase.table(Tables.BADGES).update({"display_order": item.display_order}).eq("id", item.id).execute()
        except Exception as e:
            logger.error("Failed to reorder badge %s: %s", item.id, e)


@router.post(AdminRoutes.BADGES, response_model=Badge, status_code=status.HTTP_201_CREATED)
def admin_create_badge(body: CreateBadgeRequest, _: str = Depends(get_admin_user)) -> Badge:
    try:
        resp = supabase.table(Tables.BADGES).insert(body.model_dump()).execute()
        return resp.data[0]
    except Exception as e:
        logger.error("Failed to create badge: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.put(AdminRoutes.BADGE_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_update_badge(
    badge_id: str, body: UpdateBadgeRequest, _: str = Depends(get_admin_user)
) -> None:
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return
    try:
        resp = supabase.table(Tables.BADGES).update(updates).eq("id", badge_id).execute()
    except Exception as e:
        logger.error("Failed to update badge %s: %s", badge_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Badge niet gevonden.")


@router.delete(AdminRoutes.BADGE_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_badge(badge_id: str, _: str = Depends(get_admin_user)) -> None:
    try:
        users = supabase.table(Tables.PROFILES).select("id, badge_ids").execute().data
    except Exception as e:
        logger.error("Failed to fetch users for badge cleanup %s: %s", badge_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    for user in users:
        ids = user.get("badge_ids") or []
        if badge_id in ids:
            try:
                supabase.table(Tables.PROFILES).update(
                    {"badge_ids": [b for b in ids if b != badge_id]}
                ).eq("id", user["id"]).execute()
            except Exception as e:
                logger.error("Failed to remove badge %s from user %s: %s", badge_id, user["id"], e)

    try:
        supabase.table(Tables.BADGES).delete().eq("id", badge_id).execute()
    except Exception as e:
        logger.error("Failed to delete badge %s: %s", badge_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.USER_BADGE, status_code=status.HTTP_204_NO_CONTENT)
def admin_assign_badge(user_id: str, badge_id: str, _: str = Depends(get_admin_user)) -> None:
    try:
        resp = supabase.table(Tables.PROFILES).select("badge_ids").eq("id", user_id).execute()
    except Exception as e:
        logger.error("Failed to fetch user %s for badge assignment: %s", user_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")
    ids: list[str] = resp.data[0].get("badge_ids") or []
    if badge_id not in ids:
        try:
            supabase.table(Tables.PROFILES).update({"badge_ids": ids + [badge_id]}).eq("id", user_id).execute()
        except Exception as e:
            logger.error("Failed to assign badge %s to user %s: %s", badge_id, user_id, e)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.delete(AdminRoutes.USER_BADGE, status_code=status.HTTP_204_NO_CONTENT)
def admin_unassign_badge(user_id: str, badge_id: str, _: str = Depends(get_admin_user)) -> None:
    try:
        resp = supabase.table(Tables.PROFILES).select("badge_ids").eq("id", user_id).execute()
    except Exception as e:
        logger.error("Failed to fetch user %s for badge removal: %s", user_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")
    ids: list[str] = resp.data[0].get("badge_ids") or []
    try:
        supabase.table(Tables.PROFILES).update({"badge_ids": [b for b in ids if b != badge_id]}).eq("id", user_id).execute()
    except Exception as e:
        logger.error("Failed to unassign badge %s from user %s: %s", badge_id, user_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
