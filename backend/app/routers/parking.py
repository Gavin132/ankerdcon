"""
Parking spots on the crew map: one pin per (trip, driver) — "Driver A's car
is parked here." Kept deliberately simple here: this router is just the
store (list, set, delete) and the one permission check (who may touch a
given driver's spot). Which of that driver's rides is the relevant one to
show on tap (and whether the pin has aged out) is resolved client-side from
data the crew map already has loaded — see CrewMap.tsx — not duplicated here.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.constants import Tables
from app.core.database import supabase
from app.core.logging import get_logger
from app.dependencies import _is_admin, get_current_user
from app.models.parking import ParkingSpot, SetParkingSpotRequest
from app.routes import ParkingRoutes

logger = get_logger(__name__)
router = APIRouter(prefix=ParkingRoutes.PREFIX, tags=["parking"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."
_NOT_ALLOWED = "Alleen wie met deze chauffeur meerijdt (of de chauffeur zelf) kan dit instellen."


def _day_ids_for_trip(trip_id: str) -> list[str]:
    """A "trip id" from the frontend is either an events.id (a multi-day
    trip; event_days.event_id) or an event_days.id directly (a single-day
    trip has no separate id of its own) — the same ambiguity the frontend's
    own tripIdOf() already lives with. Try the multi-day reading first."""
    try:
        days = supabase.table(Tables.EVENT_DAYS).select("id").eq("event_id", trip_id).execute().data
    except Exception as e:
        logger.error("Failed to fetch days for trip %s: %s", trip_id, e)
        return [trip_id]
    return [d["id"] for d in days] if days else [trip_id]


def _can_manage(user_name: str, trip_id: str, driver: str) -> bool:
    """Whether `user_name` may set or clear `driver`'s parking spot: the
    driver themselves, anyone who shares one of the driver's rides for this
    trip (either direction — matches "it shouldn't matter who places the
    pin"), or an admin."""
    if user_name == driver or _is_admin(user_name):
        return True
    try:
        day_ids = _day_ids_for_trip(trip_id)
        rides = (
            supabase.table(Tables.RIDES)
            .select("passengers")
            .eq("driver", driver)
            .in_("linked_event_id", day_ids)
            .execute()
            .data
        )
    except Exception as e:
        logger.error("Failed to check ride membership for %s/%s: %s", trip_id, driver, e)
        return False
    return any(user_name in (r.get("passengers") or []) for r in rides)


@router.get(ParkingRoutes.BY_TRIP, response_model=list[ParkingSpot])
def list_parking_spots(trip_id: str, _: str = Depends(get_current_user)) -> list[ParkingSpot]:
    try:
        return supabase.table(Tables.PARKING_SPOTS).select("*").eq("trip_id", trip_id).execute().data
    except Exception as e:
        logger.error("Failed to list parking spots for trip %s: %s", trip_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(ParkingRoutes.BY_TRIP, response_model=ParkingSpot, status_code=status.HTTP_201_CREATED)
def set_parking_spot(trip_id: str, body: SetParkingSpotRequest, current_user: str = Depends(get_current_user)) -> ParkingSpot:
    if not _can_manage(current_user, trip_id, body.driver):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_NOT_ALLOWED)
    try:
        resp = (
            supabase.table(Tables.PARKING_SPOTS)
            .upsert(
                {"trip_id": trip_id, "driver": body.driver, "lat": body.lat, "lng": body.lng, "placed_by": current_user},
                on_conflict="trip_id,driver",
            )
            .execute()
        )
    except Exception as e:
        logger.error("Failed to set parking spot for %s/%s: %s", trip_id, body.driver, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    return resp.data[0]


@router.delete(ParkingRoutes.DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def delete_parking_spot(trip_id: str, driver: str, current_user: str = Depends(get_current_user)) -> None:
    if not _can_manage(current_user, trip_id, driver):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_NOT_ALLOWED)
    try:
        supabase.table(Tables.PARKING_SPOTS).delete().eq("trip_id", trip_id).eq("driver", driver).execute()
    except Exception as e:
        logger.error("Failed to delete parking spot for %s/%s: %s", trip_id, driver, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
