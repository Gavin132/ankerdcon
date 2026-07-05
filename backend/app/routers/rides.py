from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.constants import Tables
from app.core.logging import get_logger
from app.dependencies import get_current_user
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
import app.services.discord_service as discord_service
from app.core.database import supabase

logger = get_logger(__name__)
router = APIRouter(prefix=RideRoutes.PREFIX, tags=["rides"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."


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
    _: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> Ride:
    new_ride = body.model_dump()
    new_ride["passengers"] = [body.driver] if body.vehicle_type == "Car" else []
    new_ride["restaurant_drivers"] = []

    try:
        response = supabase.table(Tables.RIDES).insert(new_ride).execute()
    except Exception as e:
        logger.error("Failed to create ride: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    ride = response.data[0]

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
        end_location=body.end_location or None,
        action_required=body.action_required,
    )
    return ride


@router.post(RideRoutes.CLAIM, response_model=Ride)
def claim_seat(ride_id: str, body: ClaimSeatRequest, _: str = Depends(get_current_user)) -> Ride:
    row = _get_ride_or_404(ride_id, "passengers, total_seats")
    passengers = row.get("passengers") or []

    if body.user_name not in passengers:
        if len(passengers) >= row.get("total_seats", 0):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rit is vol.")
        passengers.append(body.user_name)
        try:
            resp = supabase.table(Tables.RIDES).update({"passengers": passengers}).eq("id", ride_id).execute()
        except Exception as e:
            logger.error("Failed to claim seat on ride %s: %s", ride_id, e)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
        return resp.data[0]

    try:
        resp = supabase.table(Tables.RIDES).select("*").eq("id", ride_id).execute()
        return resp.data[0]
    except Exception as e:
        logger.error("Failed to fetch ride %s after claim: %s", ride_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(RideRoutes.LEAVE, response_model=Ride)
def leave_seat(ride_id: str, body: ClaimSeatRequest, _: str = Depends(get_current_user)) -> Ride:
    row = _get_ride_or_404(ride_id, "passengers")
    passengers = row.get("passengers") or []

    if body.user_name in passengers:
        passengers.remove(body.user_name)
        try:
            resp = supabase.table(Tables.RIDES).update({"passengers": passengers}).eq("id", ride_id).execute()
            return resp.data[0]
        except Exception as e:
            logger.error("Failed to leave ride %s: %s", ride_id, e)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    try:
        resp = supabase.table(Tables.RIDES).select("*").eq("id", ride_id).execute()
        return resp.data[0]
    except Exception as e:
        logger.error("Failed to fetch ride %s after leave: %s", ride_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


# ── Restaurant driver endpoints ────────────────────────────────────

@router.post(RideRoutes.RESTAURANT_DRIVER, status_code=status.HTTP_204_NO_CONTENT)
def add_restaurant_driver(ride_id: str, body: RestaurantDriverRequest, _: str = Depends(get_current_user)) -> None:
    row = _get_ride_or_404(ride_id, "restaurant_drivers")
    drivers = row.get("restaurant_drivers") or []

    if not any(d.get("name") == body.user_name for d in drivers):
        drivers.append({"name": body.user_name, "seats": body.seats, "passengers": []})
        try:
            supabase.table(Tables.RIDES).update({"restaurant_drivers": drivers}).eq("id", ride_id).execute()
        except Exception as e:
            logger.error("Failed to add restaurant driver to ride %s: %s", ride_id, e)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(RideRoutes.RESTAURANT_DRIVER_LEAVE, status_code=status.HTTP_204_NO_CONTENT)
def leave_restaurant_driver(ride_id: str, body: LeaveRestaurantDriverRequest, _: str = Depends(get_current_user)) -> None:
    row = _get_ride_or_404(ride_id, "restaurant_drivers")
    drivers = [d for d in (row.get("restaurant_drivers") or []) if d.get("name") != body.user_name]
    try:
        supabase.table(Tables.RIDES).update({"restaurant_drivers": drivers}).eq("id", ride_id).execute()
    except Exception as e:
        logger.error("Failed to remove restaurant driver from ride %s: %s", ride_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(RideRoutes.RESTAURANT_DRIVER_ASSIGN, status_code=status.HTTP_204_NO_CONTENT)
def assign_to_driver(ride_id: str, body: RestaurantAssignRequest, _: str = Depends(get_current_user)) -> None:
    row = _get_ride_or_404(ride_id, "restaurant_drivers")
    drivers = row.get("restaurant_drivers") or []

    target_driver = next((d for d in drivers if d.get("name") == body.driver_name), None)
    if not target_driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chauffeur niet gevonden.")

    for d in drivers:
        if body.user_name in d.get("passengers", []):
            d["passengers"].remove(body.user_name)

    target_driver.setdefault("passengers", []).append(body.user_name)

    try:
        supabase.table(Tables.RIDES).update({"restaurant_drivers": drivers}).eq("id", ride_id).execute()
    except Exception as e:
        logger.error("Failed to assign passenger to driver in ride %s: %s", ride_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(RideRoutes.RESTAURANT_DRIVER_UNASSIGN, status_code=status.HTTP_204_NO_CONTENT)
def unassign_from_driver(ride_id: str, body: RestaurantUnassignRequest, _: str = Depends(get_current_user)) -> None:
    row = _get_ride_or_404(ride_id, "restaurant_drivers")
    drivers = row.get("restaurant_drivers") or []

    for d in drivers:
        if body.user_name in d.get("passengers", []):
            d["passengers"].remove(body.user_name)

    try:
        supabase.table(Tables.RIDES).update({"restaurant_drivers": drivers}).eq("id", ride_id).execute()
    except Exception as e:
        logger.error("Failed to unassign passenger from driver in ride %s: %s", ride_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
