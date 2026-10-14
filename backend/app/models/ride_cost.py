from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class RidePassengerCost(BaseModel):
    name: str
    amount: float


class DriverCostSheet(BaseModel):
    """Everything a driver sees for one trip: the amount they entered, who shares it with them
    (the people who went to the trip in their car) and what each of those owes."""
    trip_id: str
    driver: str
    # Everything the trip cost the driver. None while nothing is entered.
    amount: Optional[float] = None
    # Who shares it with the driver, the driver not included, whether or not an amount is entered.
    group: list[str] = []
    passengers: list[RidePassengerCost] = []
    own_share: Optional[float] = None
    # The driver's rides in this trip, for a heading ("2 ritten"), not for the arithmetic.
    rides: int = 0
    # The date of the last of them (YYYY-MM-DD), to order the trips.
    last_ride: str = ""


class PassengerCostLine(BaseModel):
    """What the member owes the driver they went to a trip with."""
    trip_id: str
    driver: str
    amount: float


class RideCostOverview(BaseModel):
    """The member's ride costs across trips: as a driver (editable) and as a passenger."""
    as_driver: list[DriverCostSheet] = []
    as_passenger: list[PassengerCostLine] = []


class SetRideCostRequest(BaseModel):
    # Everything the trip cost the driver, shared by them and the people who went with them. None (or 0) means none.
    amount: Optional[float] = Field(default=None, ge=0, le=10000)
