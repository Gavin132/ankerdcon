"""
What passengers owe the driver for a trip.

The rule is deliberately simple, because it is how friends settle it anyway: everyone pays the
driver of the first ride they took to the trip. A driver enters one amount for the whole trip
(fuel, tolls, parking, everything), and it is shared equally by the driver and the people who
went to the trip with them. No distances, no per-ride weights: someone who rode in other cars
later in the trip still pays only that one driver.

  * "The first ride to the trip" is the person's earliest Heen (direction "Inbound") ride in the
    app. Someone with no Heen in the app (they came by train and were only picked up later) pays
    the driver of the first ride they were a passenger in.
  * Someone who drove their own Heen pays nobody: they are the group's driver.
  * A driver nobody went with shares the bill with no one: it stays theirs.

Only rides registered in the app count. The functions here are pure (rows in, numbers out) so the
arithmetic can be tested without a database; the router does the reading and writing.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable

PUBLIC_TRANSPORT = "Public Transport"


@dataclass
class Leg:
    """One ride, from one driver's point of view."""
    ride_id: str
    driver: str
    direction: str
    departure_time: str
    start_location: str
    end_location: str | None
    # The driver and everyone in the car.
    people: list[str]


@dataclass
class PassengerCost:
    name: str
    amount: float


@dataclass
class Sheet:
    driver: str
    amount: float | None
    # Who shares the bill with the driver (the driver not included), whether or not an amount is entered yet.
    group: list[str] = field(default_factory=list)
    passengers: list[PassengerCost] = field(default_factory=list)
    own_share: float | None = None


def _unique(names: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for n in names:
        if n and n not in seen:
            seen.add(n)
            out.append(n)
    return out


def _cents(amount: float) -> int:
    return int(round(amount * 100))


def payers(legs: list[Leg]) -> dict[str, str]:
    """Who each person in a trip pays: {person: driver}. A driver (or anyone who only ever drove) maps to themselves."""
    ordered = sorted(legs, key=lambda leg: leg.departure_time)
    out: dict[str, str] = {}
    for person in _unique(p for leg in ordered for p in leg.people):
        mine = [leg for leg in ordered if person in leg.people]
        first = next((leg for leg in mine if leg.direction == "Inbound"), None) or next(
            (leg for leg in mine if leg.driver != person), None
        )
        out[person] = first.driver if first else person
    return out


def compute_sheet(driver: str, amount: float | None, group: Iterable[str]) -> Sheet:
    """What each member of `driver`'s group owes them: the amount shared equally by the driver and the group."""
    members = [m for m in _unique(group) if m != driver]
    sheet = Sheet(driver=driver, amount=amount, group=members)
    total = _cents(amount or 0.0)
    if total <= 0 or not members:
        return sheet
    # Whole cents each; whatever is left over stays with the driver, so the shares add up to the bill exactly.
    share = total // (len(members) + 1)
    if share > 0:
        sheet.passengers = [PassengerCost(name=m, amount=share / 100) for m in sorted(members, key=str.lower)]
    sheet.own_share = (total - share * len(members)) / 100
    return sheet


def build_legs(
    rides: list[dict[str, Any]],
    meals_by_id: dict[str, dict[str, Any]],
    day_to_trip: dict[str, str],
) -> dict[str, list[Leg]]:
    """Every ride of a trip: {trip_id: [Leg, ...]}, oldest first.

    A ride belongs to a trip through the day it is linked to, or (a restaurant ride) through its
    meal's day. Public transport has no driver and no bill, and a ride that cannot be placed on
    a trip is left out."""
    out: dict[str, list[Leg]] = {}
    for ride in rides:
        if ride.get("vehicle_type") == PUBLIC_TRANSPORT:
            continue
        trip_id = trip_of_ride(ride, meals_by_id, day_to_trip)
        if not trip_id:
            continue
        common = dict(
            ride_id=ride["id"],
            direction=ride.get("direction") or "",
            departure_time=ride.get("departure_time") or "",
            start_location=ride.get("start_location") or "",
            end_location=ride.get("end_location"),
        )
        if ride.get("direction") == "Restaurant":
            # Every car going to the restaurant is its own ride for its own driver.
            for car in ride.get("restaurant_drivers") or []:
                name = car.get("name")
                if name:
                    out.setdefault(trip_id, []).append(
                        Leg(driver=name, people=_unique([name, *(car.get("passengers") or [])]), **common)
                    )
        else:
            driver = ride.get("driver")
            if driver:
                out.setdefault(trip_id, []).append(
                    Leg(driver=driver, people=_unique([driver, *(ride.get("passengers") or [])]), **common)
                )
    for legs in out.values():
        legs.sort(key=lambda leg: leg.departure_time)
    return out


def trip_of_ride(ride: dict[str, Any], meals_by_id: dict[str, dict[str, Any]], day_to_trip: dict[str, str]) -> str | None:
    day_id = ride.get("linked_event_id")
    if not day_id and ride.get("linked_meal_id"):
        day_id = (meals_by_id.get(ride["linked_meal_id"]) or {}).get("linked_event_id")
    return day_to_trip.get(day_id) if day_id else None
