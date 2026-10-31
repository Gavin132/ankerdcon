"""
Ride costs: what passengers owe a driver for a trip, as an overview in Financiën.

The driver enters what the trip cost them in total and the app shares it out among them and the
people who went to the trip in their car (see app/services/ride_costs.py). Nothing is booked or
paid here: it is a statement the driver can read off, and the settling happens outside the app
(a Tikkie, say).
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.constants import Tables
from app.core.database import supabase
from app.core.logging import get_logger
from app.dependencies import get_current_user
from app.models.ride_cost import (
    DriverCostSheet,
    PassengerCostLine,
    RideCostOverview,
    RidePassengerCost,
    SetRideCostRequest,
)
from app.routes import RideCostRoutes
from app.services import ride_costs as calc

logger = get_logger(__name__)
router = APIRouter(prefix=RideCostRoutes.PREFIX, tags=["ride-costs"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."
_NO_RIDES = "Je hebt geen ritten als chauffeur in deze trip."


class _Data:
    """The rows the overview is built from, read in one go."""

    def __init__(self) -> None:
        rides: list[dict[str, Any]] = supabase.table(Tables.RIDES).select("*").execute().data or []
        meals_by_id: dict[str, dict[str, Any]] = {
            m["id"]: m for m in (supabase.table(Tables.MEALS).select("*").execute().data or [])
        }
        days = supabase.table(Tables.EVENT_DAYS).select("id, event_id").execute().data or []
        # What each driver entered per (trip, driver). Older rows kept parking apart: it is all one amount now.
        self.amounts: dict[tuple[str, str], float] = {
            (c["trip_id"], c["driver"]): float(c.get("total_amount") or 0) + float(c.get("parking_amount") or 0)
            for c in (supabase.table(Tables.RIDE_COSTS).select("*").execute().data or [])
        }
        # A trip's id is its event's id when it has several days, else its one day's id.
        per_event: dict[str, int] = {}
        for d in days:
            per_event[d["event_id"]] = per_event.get(d["event_id"], 0) + 1
        day_to_trip = {d["id"]: (d["event_id"] if per_event[d["event_id"]] > 1 else d["id"]) for d in days}
        self.legs = calc.build_legs(rides, meals_by_id, day_to_trip)

    def sheet(self, trip_id: str, driver: str) -> calc.Sheet:
        legs = self.legs[trip_id]
        group = [person for person, pays in calc.payers(legs).items() if pays == driver]
        return calc.compute_sheet(driver, self.amounts.get((trip_id, driver)) or None, group)


def _overview(data: _Data, me: str) -> RideCostOverview:
    as_driver: list[DriverCostSheet] = []
    as_passenger: list[PassengerCostLine] = []
    for trip_id, legs in data.legs.items():
        for driver in dict.fromkeys(leg.driver for leg in legs):
            sheet = data.sheet(trip_id, driver)
            if driver == me:
                mine = [leg for leg in legs if leg.driver == me]
                as_driver.append(DriverCostSheet(
                    trip_id=trip_id, driver=me, amount=sheet.amount, group=sheet.group,
                    passengers=[RidePassengerCost(name=p.name, amount=p.amount) for p in sheet.passengers],
                    own_share=sheet.own_share, rides=len(mine),
                    last_ride=max(leg.departure_time for leg in mine)[:10],
                ))
            else:
                for p in sheet.passengers:
                    if p.name == me:
                        as_passenger.append(PassengerCostLine(trip_id=trip_id, driver=driver, amount=p.amount))
    as_driver.sort(key=lambda s: s.last_ride, reverse=True)
    return RideCostOverview(as_driver=as_driver, as_passenger=as_passenger)


@router.get(RideCostRoutes.LIST, response_model=RideCostOverview)
def get_ride_costs(current_user: str = Depends(get_current_user)) -> RideCostOverview:
    try:
        return _overview(_Data(), current_user)
    except Exception as e:
        logger.error("Failed to build ride costs for %s: %s", current_user, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.put(RideCostRoutes.TRIP, status_code=status.HTTP_204_NO_CONTENT)
def set_ride_cost(trip_id: str, body: SetRideCostRequest, current_user: str = Depends(get_current_user)) -> None:
    """What the trip cost the driver, all in one. Nothing (or 0) removes the row."""
    try:
        if not any(leg.driver == current_user for leg in _Data().legs.get(trip_id, [])):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NO_RIDES)
        if not body.amount:
            supabase.table(Tables.RIDE_COSTS).delete().eq("trip_id", trip_id).eq("driver", current_user).execute()
        else:
            supabase.table(Tables.RIDE_COSTS).upsert(
                {
                    "trip_id": trip_id,
                    "driver": current_user,
                    "total_amount": round(body.amount, 2),
                    "parking_amount": 0,
                    "updated_at": "now()",
                },
                on_conflict="trip_id,driver",
            ).execute()
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to save the ride cost of %s for %s: %s", current_user, trip_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
