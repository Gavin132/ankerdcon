from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.constants import Tables
from app.core.atomic import update_list
from app.core.logging import get_logger
from app.dependencies import act_as, act_for_anyone, get_current_user, require_owner_or_admin
from app.models.rides import (
    ClaimSeatRequest,
    CreateRideRequest,
    LeaveRestaurantDriverRequest,
    RestaurantAssignRequest,
    RestaurantDriverRequest,
    RestaurantUnassignRequest,
    Ride,
)
from app.routes import RideRoutes
from app.services import notification_service
from app.services.discord_bot import escape_markdown
from app import messages as M
from app.core.database import supabase

logger = get_logger(__name__)
router = APIRouter(prefix=RideRoutes.PREFIX, tags=["rides"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."


def _day_ride_eligible_names(direction: str, linked_event_id: str | None, linked_meal_id: str | None, new_ride_id: str) -> set[str] | None:
    """Who a new ride's notification should reach: members signed up for that
    event day who don't already have a ride covering the same need — the
    same direction that day, or for a Restaurant ride, a ride to that same
    meal specifically (there being at most one Restaurant ride per meal).

    Returns None (no extra filtering — every opted-in member) when the ride
    has no day link at all, since there is then nothing to check "signed up"
    against.
    """
    if not linked_event_id:
        return None
    try:
        days = supabase.table(Tables.EVENT_DAYS).select("participants").eq("id", linked_event_id).execute().data
    except Exception as e:
        logger.error("Ride notification: failed to fetch day %s: %s", linked_event_id, e)
        return None
    if not days:
        return None
    participants = set(days[0].get("participants") or [])
    if not participants:
        return set()

    try:
        query = supabase.table(Tables.RIDES).select("id, driver, passengers, restaurant_drivers").eq("direction", direction)
        query = query.eq("linked_meal_id", linked_meal_id) if direction == "Restaurant" else query.eq("linked_event_id", linked_event_id)
        others = query.execute().data or []
    except Exception as e:
        logger.error("Ride notification: failed to fetch existing rides: %s", e)
        return participants  # can't tell who's already covered — notify everyone signed up rather than no one

    covered: set[str] = set()
    for row in others:
        if row.get("id") == new_ride_id:
            continue
        covered.add(row.get("driver"))
        covered.update(row.get("passengers") or [])
        for d in row.get("restaurant_drivers") or []:
            covered.add(d.get("name"))
            covered.update(d.get("passengers") or [])

    return participants - covered


def _notify_ride_created(settings: Settings, body: CreateRideRequest, driver: str, ride_id: str) -> None:
    """The two DB reads `_day_ride_eligible_names` needs are pure
    nice-to-have filtering, not something the response to the driver should
    wait on — done here, inside the background task, alongside the send
    itself rather than before `create_ride` returns."""
    eligible = _day_ride_eligible_names(body.direction, body.linked_event_id, body.linked_meal_id, ride_id)
    notification_service.broadcast_category_dm(
        settings.discord_bot_token,
        notification_service.NotificationCategory.RIDE_CREATED,
        M.DM_RIDE_CREATED.format(
            driver=escape_markdown(driver),
            departure_time=escape_markdown(body.departure_time),
            start_location=escape_markdown(body.start_location),
        ),
        eligible,
    )


def _get_ride_or_404(ride_id: str, fields: str = "*") -> dict:
    """Fetch a ride by ID or raise 404. Wraps DB errors as 503."""
    try:
        resp = supabase.table(Tables.RIDES).select(fields).eq("id", ride_id).execute()
    except Exception as e:
        logger.error("DB error fetching ride %s: %s", ride_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rit niet gevonden.")
    return resp.data[0]


@router.get(RideRoutes.LIST, response_model=list[Ride])
def list_rides(
    direction: Literal["Inbound", "Outbound", "Restaurant"] | None = None,
    _: str = Depends(get_current_user),
) -> list[Ride]:
    try:
        query = supabase.table(Tables.RIDES).select("*").order("departure_time")
        if direction:
            query = query.eq("direction", direction)
        return query.execute().data
    except Exception as e:
        logger.error("Failed to list rides: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(RideRoutes.LIST, response_model=Ride)
def create_ride(
    body: CreateRideRequest,
    background_tasks: BackgroundTasks,
    current_user: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> Ride:
    driver = act_as(current_user, body.driver)
    new_ride = {**body.model_dump(), "driver": driver}
    new_ride["passengers"] = [driver] if body.vehicle_type == "Car" else []
    new_ride["restaurant_drivers"] = []

    try:
        response = supabase.table(Tables.RIDES).insert(new_ride).execute()
    except Exception as e:
        logger.error("Failed to create ride: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    ride = response.data[0]

    background_tasks.add_task(_notify_ride_created, settings, body, driver, ride["id"])
    return ride


@router.delete(RideRoutes.DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def delete_ride(ride_id: str, current_user: str = Depends(get_current_user)) -> None:
    """Lets a driver take back their own ride — e.g. the "Ik rijd" button on
    a direction that already has their ride now offers to remove it instead
    of letting them create a second one. Admins may remove anyone's."""
    row = _get_ride_or_404(ride_id, "driver")
    require_owner_or_admin(current_user, row.get("driver"), "Je kunt alleen je eigen rit verwijderen.")
    try:
        supabase.table(Tables.RIDES).delete().eq("id", ride_id).execute()
    except Exception as e:
        logger.error("Failed to delete ride %s: %s", ride_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(RideRoutes.CLAIM, response_model=Ride)
def claim_seat(ride_id: str, body: ClaimSeatRequest, current_user: str = Depends(get_current_user)) -> Ride:
    user_name = act_for_anyone(current_user, body.user_name, adding=True)

    def take(passengers: list, row: dict) -> list | None:
        if user_name in passengers:
            return None
        # Checked again on every retry, so two people cannot both take the last seat.
        if len(passengers) >= (row.get("total_seats") or 0):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rit is vol.")
        return passengers + [user_name]

    update_list(Tables.RIDES, ride_id, "passengers", take, select="passengers, total_seats", not_found="Rit niet gevonden.")
    return _get_ride_or_404(ride_id)


@router.post(RideRoutes.LEAVE, response_model=Ride)
def leave_seat(ride_id: str, body: ClaimSeatRequest, current_user: str = Depends(get_current_user)) -> Ride:
    user_name = act_for_anyone(current_user, body.user_name)
    update_list(
        Tables.RIDES, ride_id, "passengers",
        lambda passengers, _row: [p for p in passengers if p != user_name] if user_name in passengers else None,
        not_found="Rit niet gevonden.",
    )
    return _get_ride_or_404(ride_id)


# ── Restaurant driver endpoints ────────────────────────────────────

@router.post(RideRoutes.RESTAURANT_DRIVER, status_code=status.HTTP_204_NO_CONTENT)
def add_restaurant_driver(ride_id: str, body: RestaurantDriverRequest, current_user: str = Depends(get_current_user)) -> None:
    user_name = act_for_anyone(current_user, body.user_name, adding=True)

    def add(drivers: list, _row: dict) -> list | None:
        if any(d.get("name") == user_name for d in drivers):
            return None
        # The driver counts as one of their own seats, so a new car with 5
        # seats starts at 1/5 rather than 0/5.
        return drivers + [{"name": user_name, "seats": body.seats, "passengers": [user_name]}]

    update_list(Tables.RIDES, ride_id, "restaurant_drivers", add, jsonb=True, not_found="Rit niet gevonden.")


@router.post(RideRoutes.RESTAURANT_DRIVER_LEAVE, status_code=status.HTTP_204_NO_CONTENT)
def leave_restaurant_driver(ride_id: str, body: LeaveRestaurantDriverRequest, current_user: str = Depends(get_current_user)) -> None:
    user_name = act_for_anyone(current_user, body.user_name)
    update_list(
        Tables.RIDES, ride_id, "restaurant_drivers",
        lambda drivers, _row: [d for d in drivers if d.get("name") != user_name],
        jsonb=True, not_found="Rit niet gevonden.",
    )


@router.post(RideRoutes.RESTAURANT_DRIVER_ASSIGN, status_code=status.HTTP_204_NO_CONTENT)
def assign_to_driver(ride_id: str, body: RestaurantAssignRequest, current_user: str = Depends(get_current_user)) -> None:
    user_name = act_for_anyone(current_user, body.user_name, adding=True)

    def assign(drivers: list, _row: dict) -> list | None:
        target_driver = next((d for d in drivers if d.get("name") == body.driver_name), None)
        if not target_driver:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chauffeur niet gevonden.")
        for d in drivers:
            if user_name in d.get("passengers", []):
                d["passengers"].remove(user_name)
        target_driver.setdefault("passengers", []).append(user_name)
        return drivers

    update_list(Tables.RIDES, ride_id, "restaurant_drivers", assign, jsonb=True, not_found="Rit niet gevonden.")


@router.post(RideRoutes.RESTAURANT_DRIVER_UNASSIGN, status_code=status.HTTP_204_NO_CONTENT)
def unassign_from_driver(ride_id: str, body: RestaurantUnassignRequest, current_user: str = Depends(get_current_user)) -> None:
    user_name = act_for_anyone(current_user, body.user_name)

    def unassign(drivers: list, _row: dict) -> list | None:
        for d in drivers:
            if user_name in d.get("passengers", []):
                d["passengers"].remove(user_name)
        return drivers

    update_list(Tables.RIDES, ride_id, "restaurant_drivers", unassign, jsonb=True, not_found="Rit niet gevonden.")
