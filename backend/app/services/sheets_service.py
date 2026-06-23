"""All Google Sheets read/write operations.

Each function takes a gspread.Spreadsheet as its first argument so it is
fully testable without any FastAPI or dependency-injection machinery.
"""

from __future__ import annotations

from datetime import datetime

import gspread
import pandas as pd

from app.core import sheets as _cache
from app.models.calendar import CalendarEvent
from app.models.meal import Meal
from app.models.payment import Payment, Split
from app.models.ride import Ride
from app.models.user import User

# ---------------------------------------------------------------------------
# Column indices (1-based, matching Google Sheets column positions)
# ---------------------------------------------------------------------------
_USER_COLS: dict[str, int] = {
    "Name": 1,
    "Phone Number": 2,
    "Hotel Room": 3,
    "Live Location Ping": 4,
    "Passcode": 5,
    "Color": 6,
    "Font": 7,
    "Pronouns": 8,
    "Bio": 9,
    "Banner Color": 10,
}
_RIDES_COLS: dict[str, int] = {
    "Direction": 1,
    "Vehicle Type": 2,
    "Driver": 3,
    "Departure Time": 4,
    "Start Location": 5,
    "Total Seats": 6,
    "Passengers": 7,
    "Parking Info": 8,
    "Maps Link": 9,
    "Car Available": 10,
    "Action Required": 11,
}
_CALENDAR_COLS: dict[str, int] = {
    "Participants": 5,
}
_MEALS_COLS: dict[str, int] = {
    "Meal Name": 1,
    "Time": 2,
    "Location (Optional)": 3,
    "Cost": 4,
    "RSVPs": 5,
    "Transport Needed": 6,
}
_PAYMENTS_COLS: dict[str, int] = {
    "Paid By": 1,
    "Amount": 2,
    "Description": 3,
    "Date": 4,
    "Splits": 5,
}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _normalize_list(value: str) -> list[str]:
    return [item.strip() for item in str(value).split(",") if item.strip()]


def _safe_int(value: str, default: int = 0) -> int:
    try:
        return int(str(value).strip())
    except (ValueError, TypeError):
        return default


def _safe_float(value: object, default: float = 0.0) -> float:
    try:
        return float(str(value).strip().replace(",", "."))
    except (ValueError, TypeError):
        return default


def _blank(value: object) -> bool:
    """Return True if a cell value is empty / whitespace / nan."""
    return not str(value).strip() or str(value).strip().lower() == "nan"


def _worksheet(spreadsheet: gspread.Spreadsheet, tab: str) -> gspread.Worksheet:
    return spreadsheet.worksheet(tab)


def _ensure_rides_schema(ws: gspread.Worksheet) -> None:
    rows = ws.get_all_values()

    # Skip header row
    for row_idx, row in enumerate(rows[1:], start=2):
        if len(row) < 11:
            ws.update(f"A{row_idx}:K{row_idx}", [row + [""] * (11 - len(row))])


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


def get_users(spreadsheet: gspread.Spreadsheet) -> list[User]:
    df = _cache.get_cached_tables(spreadsheet).get("Users", pd.DataFrame())
    if df.empty:
        return []
    return [
        User(
            row_number=int(row["row_number"]),
            name=row.get("Name", "").strip(),
            phone_number=row.get("Phone Number", "").strip(),
            hotel_room=row.get("Hotel Room", "").strip(),
            live_location_ping=row.get("Live Location Ping", "").strip(),
            color=row.get("Color", "").strip(),
            font=row.get("Font", "").strip(),
            bio=row.get("Bio", "").strip(),
            banner_color=row.get("Banner Color", "").strip(),
            pronouns=row.get("Pronouns", "").strip(),
        )
        for _, row in df.iterrows()
        if not _blank(row.get("Name", ""))
    ]


def get_user_names(spreadsheet: gspread.Spreadsheet) -> list[str]:
    """Return only names — safe to expose publicly for the login name picker."""
    df = _cache.get_cached_tables(spreadsheet).get("Users", pd.DataFrame())
    if df.empty:
        return []
    return [
        str(row.get("Name", "")).strip()
        for _, row in df.iterrows()
        if not _blank(row.get("Name", ""))
    ]


def check_passcode(spreadsheet: gspread.Spreadsheet, user_name: str, passcode: str) -> bool:
    """Return True if the passcode matches the stored value for this user."""
    df = _cache.get_cached_tables(spreadsheet).get("Users", pd.DataFrame())
    match = df[df["Name"] == user_name]
    if match.empty:
        return False
    stored = str(match.iloc[0].get("Passcode", "")).strip()
    return bool(stored) and stored == passcode


def update_user_preferences(
    spreadsheet: gspread.Spreadsheet,
    user_name: str,
    color: str | None,
    font: str | None,
    bio: str | None = None,
    banner_color: str | None = None,
    pronouns: str | None = None,
) -> None:
    df = _cache.get_cached_tables(spreadsheet).get("Users", pd.DataFrame())
    match = df[df["Name"] == user_name]
    if match.empty:
        raise ValueError(f"Gebruiker '{user_name}' niet gevonden")
    row_number = int(match.iloc[0]["row_number"])
    ws = _worksheet(spreadsheet, "Users")
    if color is not None:
        ws.update_cell(row_number, _USER_COLS["Color"], color)
    if font is not None:
        ws.update_cell(row_number, _USER_COLS["Font"], font)
    if bio is not None:
        ws.update_cell(row_number, _USER_COLS["Bio"], bio)
    if banner_color is not None:
        ws.update_cell(row_number, _USER_COLS["Banner Color"], banner_color)
    if pronouns is not None:
        ws.update_cell(row_number, _USER_COLS["Pronouns"], pronouns)
    _cache.invalidate_cache()


def update_user_location(
    spreadsheet: gspread.Spreadsheet,
    user_name: str,
    zone: str,
    text: str,
) -> None:
    df = _cache.get_cached_tables(spreadsheet).get("Users", pd.DataFrame())
    match = df[df["Name"] == user_name]
    if match.empty:
        raise ValueError(f"User '{user_name}' not found")
    row_number = int(match.iloc[0]["row_number"])
    timestamp = datetime.now().strftime("%H:%M")
    ping_value = f"{zone}|{text} (at {timestamp})"
    _worksheet(spreadsheet, "Users").update_cell(
        row_number, _USER_COLS["Live Location Ping"], ping_value
    )
    _cache.invalidate_cache()


# ---------------------------------------------------------------------------
# Rides
# ---------------------------------------------------------------------------


def get_rides(spreadsheet: gspread.Spreadsheet) -> list[Ride]:
    df = _cache.get_cached_tables(spreadsheet).get("Rides", pd.DataFrame())
    if df.empty:
        return []

    rides: list[Ride] = []
    for _, row in df.iterrows():
        # Skip rows missing required fields
        if _blank(row.get("Direction", "")) or _blank(row.get("Driver", "")):
            continue
        passengers = _normalize_list(row.get("Passengers", ""))
        total_seats = _safe_int(row.get("Total Seats", "0"))
        is_pt = row.get("Vehicle Type", "").strip().lower() == "public transport"
        seats_left = max(total_seats - len(passengers), 0)
        rides.append(
            Ride(
                row_number=int(row["row_number"]),
                direction=row.get("Direction", "").strip().title(),
                vehicle_type=row.get("Vehicle Type", "").strip(),
                driver=row.get("Driver", "").strip(),
                departure_time=row.get("Departure Time", "").strip(),
                start_location=row.get("Start Location", "").strip(),
                total_seats=total_seats,
                passengers=passengers,
                parking_info=row.get("Parking Info", "").strip(),
                maps_link=row.get("Maps Link", "").strip(),
                car_available=str(row.get("Car Available", "")).strip().upper()
                == "TRUE",
                action_required=str(row.get("Action Required", "")).strip().upper()
                == "TRUE",
                seats_left=seats_left,
                is_full=not is_pt and seats_left <= 0,
                is_public_transport=is_pt,
            )
        )
    return rides


def create_ride(
    spreadsheet: gspread.Spreadsheet,
    direction: str,
    vehicle_type: str,
    driver: str,
    departure_time: str,
    start_location: str,
    total_seats: int,
    parking_info: str = "",
    maps_link: str = "",
    car_available: bool = False,
    action_required: bool = False,
) -> None:
    ws = _worksheet(spreadsheet, "Rides")

    values = [
        direction,
        vehicle_type,
        driver,
        departure_time,
        start_location,
        str(total_seats),
        "",  # Passengers
        parking_info,
        maps_link,
        "TRUE" if car_available else "FALSE",
        "TRUE" if action_required else "FALSE",
    ]

    # Find the actual last used row and force insertion below it.
    last_row = len(ws.get_all_values())

    ws.insert_row(
        values,
        index=last_row + 1,
        value_input_option="USER_ENTERED",
    )

    _cache.invalidate_cache()


def claim_ride_seat(
    spreadsheet: gspread.Spreadsheet,
    row_number: int,
    user_name: str,
) -> None:
    ride = next((r for r in get_rides(spreadsheet) if r.row_number == row_number), None)
    if ride is None:
        raise ValueError("Ride not found")
    if user_name in ride.passengers:
        raise ValueError("Already on this transport")
    if ride.is_full:
        raise ValueError("This ride is full")

    updated = ride.passengers + [user_name]
    _worksheet(spreadsheet, "Rides").update_cell(
        row_number, _RIDES_COLS["Passengers"], ", ".join(updated)
    )
    _cache.invalidate_cache()


def leave_ride_seat(
    spreadsheet: gspread.Spreadsheet,
    row_number: int,
    user_name: str,
) -> None:
    ride = next((r for r in get_rides(spreadsheet) if r.row_number == row_number), None)
    if ride is None:
        raise ValueError("Ride not found")
    if user_name not in ride.passengers:
        raise ValueError("Not on this transport")

    updated = [p for p in ride.passengers if p != user_name]
    _worksheet(spreadsheet, "Rides").update_cell(
        row_number, _RIDES_COLS["Passengers"], ", ".join(updated)
    )
    _cache.invalidate_cache()


def _parse_restaurant_drivers(parking_info: str) -> list[dict]:
    import json
    raw = str(parking_info).strip()
    if not raw or raw.lower() == "nan":
        return []
    try:
        data = json.loads(raw)
        return [d for d in data if "name" in d and "seats" in d]
    except Exception:
        return []


def add_restaurant_driver(
    spreadsheet: gspread.Spreadsheet,
    row_number: int,
    user_name: str,
    seats: int,
) -> None:
    import json
    ride = next((r for r in get_rides(spreadsheet) if r.row_number == row_number), None)
    if ride is None:
        raise ValueError("Ride not found")
    drivers = _parse_restaurant_drivers(ride.parking_info)
    if any(d["name"] == user_name for d in drivers):
        raise ValueError("Already registered as driver")
    drivers.append({"name": user_name, "seats": seats})
    _worksheet(spreadsheet, "Rides").update_cell(
        row_number, _RIDES_COLS["Parking Info"], json.dumps(drivers)
    )
    _cache.invalidate_cache()


def remove_restaurant_driver(
    spreadsheet: gspread.Spreadsheet,
    row_number: int,
    user_name: str,
) -> None:
    import json
    ride = next((r for r in get_rides(spreadsheet) if r.row_number == row_number), None)
    if ride is None:
        raise ValueError("Ride not found")
    drivers = _parse_restaurant_drivers(ride.parking_info)
    if not any(d["name"] == user_name for d in drivers):
        raise ValueError("Not registered as driver")
    drivers = [d for d in drivers if d["name"] != user_name]
    _worksheet(spreadsheet, "Rides").update_cell(
        row_number, _RIDES_COLS["Parking Info"], json.dumps(drivers) if drivers else ""
    )
    _cache.invalidate_cache()


def assign_to_driver(
    spreadsheet: gspread.Spreadsheet,
    row_number: int,
    user_name: str,
    driver_name: str,
) -> None:
    import json
    ride = next((r for r in get_rides(spreadsheet) if r.row_number == row_number), None)
    if ride is None:
        raise ValueError("Ride not found")
    drivers = _parse_restaurant_drivers(ride.parking_info)
    target = next((d for d in drivers if d["name"] == driver_name), None)
    if target is None:
        raise ValueError(f"Driver '{driver_name}' not found")
    if user_name == driver_name:
        raise ValueError("Je kunt niet in je eigen auto stappen")

    # Remove from any existing driver assignment first
    for d in drivers:
        pax = d.get("passengers", [])
        if user_name in pax:
            pax.remove(user_name)
        d["passengers"] = pax

    pax = target.get("passengers", [])
    if len(pax) >= target["seats"]:
        raise ValueError(f"Auto van {driver_name} is vol")
    if user_name not in pax:
        pax.append(user_name)
    target["passengers"] = pax

    _worksheet(spreadsheet, "Rides").update_cell(
        row_number, _RIDES_COLS["Parking Info"], json.dumps(drivers)
    )
    _cache.invalidate_cache()


def unassign_from_driver(
    spreadsheet: gspread.Spreadsheet,
    row_number: int,
    user_name: str,
) -> None:
    import json
    ride = next((r for r in get_rides(spreadsheet) if r.row_number == row_number), None)
    if ride is None:
        raise ValueError("Ride not found")
    drivers = _parse_restaurant_drivers(ride.parking_info)

    for d in drivers:
        pax = d.get("passengers", [])
        if user_name in pax:
            pax.remove(user_name)
        d["passengers"] = pax

    _worksheet(spreadsheet, "Rides").update_cell(
        row_number, _RIDES_COLS["Parking Info"], json.dumps(drivers)
    )
    _cache.invalidate_cache()


# ---------------------------------------------------------------------------
# Meals
# ---------------------------------------------------------------------------


def get_meals(spreadsheet: gspread.Spreadsheet) -> list[Meal]:
    df = _cache.get_cached_tables(spreadsheet).get("Meals", pd.DataFrame())
    if df.empty:
        return []
    return [
        Meal(
            row_number=int(row["row_number"]),
            meal_name=row.get("Meal Name", "").strip(),
            time=row.get("Time", "").strip(),
            location=row.get("Location (Optional)", "").strip(),
            cost=row.get("Cost", "").strip(),
            rsvps=_normalize_list(row.get("RSVPs", "")),
            transport_needed=str(row.get("Transport Needed", "")).strip().upper()
            == "TRUE",
        )
        for _, row in df.iterrows()
        if not _blank(row.get("Meal Name", ""))
    ]


def create_meal(
    spreadsheet: gspread.Spreadsheet,
    meal_name: str,
    time: str,
    location: str,
    cost: str,
    transport_needed: bool,
) -> None:
    _worksheet(spreadsheet, "Meals").append_row(
        [meal_name, time, location, cost, "", "TRUE" if transport_needed else "FALSE"],
        value_input_option="USER_ENTERED",
    )
    _cache.invalidate_cache()


def rsvp_meal(
    spreadsheet: gspread.Spreadsheet,
    row_number: int,
    user_name: str,
) -> None:
    meal = next((m for m in get_meals(spreadsheet) if m.row_number == row_number), None)
    if meal is None:
        raise ValueError("Meal not found")
    if user_name in meal.rsvps:
        raise ValueError("Already RSVPed for this meal")

    updated = meal.rsvps + [user_name]
    _worksheet(spreadsheet, "Meals").update_cell(
        row_number, _MEALS_COLS["RSVPs"], ", ".join(updated)
    )
    _cache.invalidate_cache()


def cancel_meal_rsvp(
    spreadsheet: gspread.Spreadsheet,
    row_number: int,
    user_name: str,
) -> None:
    meal = next((m for m in get_meals(spreadsheet) if m.row_number == row_number), None)
    if meal is None:
        raise ValueError("Meal not found")
    if user_name not in meal.rsvps:
        raise ValueError("Not RSVPed for this meal")

    updated = [r for r in meal.rsvps if r != user_name]
    _worksheet(spreadsheet, "Meals").update_cell(
        row_number, _MEALS_COLS["RSVPs"], ", ".join(updated)
    )
    _cache.invalidate_cache()


def delete_meal(
    spreadsheet: gspread.Spreadsheet,
    row_number: int,
) -> None:
    meal = next((m for m in get_meals(spreadsheet) if m.row_number == row_number), None)
    if meal is None:
        raise ValueError("Meal not found")
    _worksheet(spreadsheet, "Meals").delete_rows(row_number)
    _cache.invalidate_cache()


# ---------------------------------------------------------------------------
# Payments
# ---------------------------------------------------------------------------


def _parse_splits(value: object) -> list[Split]:
    import json

    raw = str(value).strip()
    if not raw or raw.lower() == "nan":
        return []
    try:
        data = json.loads(raw)
        return [
            Split(name=s["name"], amount=float(s["amount"]))
            for s in data
            if "name" in s and "amount" in s
        ]
    except Exception:
        return []


def get_payments(spreadsheet: gspread.Spreadsheet) -> list[Payment]:
    df = _cache.get_cached_tables(spreadsheet).get("Payments", pd.DataFrame())
    if df.empty:
        return []
    return [
        Payment(
            row_number=int(row["row_number"]),
            paid_by=row.get("Paid By", "").strip(),
            amount=_safe_float(row.get("Amount", 0)),
            description=row.get("Description", "").strip(),
            date=row.get("Date", "").strip(),
            splits=_parse_splits(row.get("Splits", "")),
        )
        for _, row in df.iterrows()
        if not _blank(row.get("Paid By", "")) and not _blank(row.get("Amount", ""))
    ]


def create_payment(
    spreadsheet: gspread.Spreadsheet,
    paid_by: str,
    amount: float,
    description: str,
    date: str,
    splits: list[Split] | None = None,
) -> None:
    import json

    splits_json = (
        json.dumps([{"name": s.name, "amount": s.amount} for s in splits])
        if splits
        else ""
    )
    _worksheet(spreadsheet, "Payments").append_row(
        [paid_by, amount, description, date, splits_json],
        value_input_option="USER_ENTERED",
    )
    _cache.invalidate_cache()


def delete_payment(
    spreadsheet: gspread.Spreadsheet,
    row_number: int,
    user_name: str,
) -> None:
    payment = next(
        (p for p in get_payments(spreadsheet) if p.row_number == row_number), None
    )
    if payment is None:
        raise ValueError("Payment not found")
    if payment.paid_by != user_name:
        raise ValueError("Only the payer can delete this payment")
    _worksheet(spreadsheet, "Payments").delete_rows(row_number)
    _cache.invalidate_cache()


# ---------------------------------------------------------------------------
# Calendar
# ---------------------------------------------------------------------------


def get_calendar(spreadsheet: gspread.Spreadsheet) -> list[CalendarEvent]:
    df = _cache.get_cached_tables(spreadsheet).get("Calendar", pd.DataFrame())
    if df.empty:
        return []
    return [
        CalendarEvent(
            row_number=int(row["row_number"]),
            date=row.get("Date", "").strip(),
            event_id=row.get("Event ID", "").strip() or f"event_{row['row_number']}",
            event_name=row.get("Event Name", "").strip(),
            is_hotel=str(row.get("Is Hotel", "")).strip().upper() == "TRUE",
            participants=_normalize_list(row.get("Participants", "")),
        )
        for _, row in df.iterrows()
        if not _blank(row.get("Date", "")) and not _blank(row.get("Event Name", ""))
    ]


def rsvp_calendar_event(
    spreadsheet: gspread.Spreadsheet,
    row_number: int,
    user_name: str,
) -> None:
    event = next(
        (e for e in get_calendar(spreadsheet) if e.row_number == row_number), None
    )
    if event is None:
        raise ValueError("Event not found")
    if user_name in event.participants:
        raise ValueError("Already signed up for this event")

    updated = event.participants + [user_name]
    _worksheet(spreadsheet, "Calendar").update_cell(
        row_number, _CALENDAR_COLS["Participants"], ", ".join(updated)
    )
    _cache.invalidate_cache()


def leave_calendar_event(
    spreadsheet: gspread.Spreadsheet,
    row_number: int,
    user_name: str,
) -> None:
    event = next(
        (e for e in get_calendar(spreadsheet) if e.row_number == row_number), None
    )
    if event is None:
        raise ValueError("Event not found")
    if user_name not in event.participants:
        raise ValueError("Not signed up for this event")

    updated = [p for p in event.participants if p != user_name]
    _worksheet(spreadsheet, "Calendar").update_cell(
        row_number, _CALENDAR_COLS["Participants"], ", ".join(updated)
    )
    _cache.invalidate_cache()
