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
from app.models.payment import Payment
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


def _worksheet(spreadsheet: gspread.Spreadsheet, tab: str) -> gspread.Worksheet:
    return spreadsheet.worksheet(tab)


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
            name=row.get("Name", ""),
            phone_number=row.get("Phone Number", ""),
            hotel_room=row.get("Hotel Room", ""),
            live_location_ping=row.get("Live Location Ping", ""),
        )
        for _, row in df.iterrows()
    ]


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
        passengers = _normalize_list(row.get("Passengers", ""))
        total_seats = _safe_int(row.get("Total Seats", "0"))
        is_pt = row.get("Vehicle Type", "").strip().lower() == "public transport"
        seats_left = max(total_seats - len(passengers), 0)
        rides.append(
            Ride(
                row_number=int(row["row_number"]),
                direction=row.get("Direction", "").strip().title(),
                vehicle_type=row.get("Vehicle Type", "").strip(),
                driver=row.get("Driver", ""),
                departure_time=row.get("Departure Time", ""),
                start_location=row.get("Start Location", ""),
                total_seats=total_seats,
                passengers=passengers,
                parking_info=row.get("Parking Info", ""),
                maps_link=row.get("Maps Link", ""),
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
) -> None:
    _worksheet(spreadsheet, "Rides").append_row(
        [
            direction,
            vehicle_type,
            driver,
            departure_time,
            start_location,
            str(total_seats),
            "",  # Passengers — empty on creation
            parking_info,
            maps_link,
        ],
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
            meal_name=row.get("Meal Name", ""),
            time=row.get("Time", ""),
            location=row.get("Location (Optional)", ""),
            cost=row.get("Cost", ""),
            rsvps=_normalize_list(row.get("RSVPs", "")),
            transport_needed=str(row.get("Transport Needed", "")).strip().upper()
            == "TRUE",
        )
        for _, row in df.iterrows()
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


# ---------------------------------------------------------------------------
# Payments
# ---------------------------------------------------------------------------


def get_payments(spreadsheet: gspread.Spreadsheet) -> list[Payment]:
    df = _cache.get_cached_tables(spreadsheet).get("Payments", pd.DataFrame())
    if df.empty:
        return []
    return [
        Payment(
            row_number=int(row["row_number"]),
            paid_by=row.get("Paid By", ""),
            amount=row.get("Amount", ""),
            description=row.get("Description", ""),
            date=row.get("Date", ""),
        )
        for _, row in df.iterrows()
    ]


def create_payment(
    spreadsheet: gspread.Spreadsheet,
    paid_by: str,
    amount: str,
    description: str,
    date: str,
) -> None:
    _worksheet(spreadsheet, "Payments").append_row(
        [paid_by, amount, description, date],
        value_input_option="USER_ENTERED",
    )
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
            date=row.get("Date", ""),
            event_id=row.get("Event ID", "DefaultEvent"),
            event_name=row.get("Event Name", ""),
            is_hotel=str(row.get("Is Hotel", "")).strip().upper() == "TRUE",
            participants=_normalize_list(row.get("Participants", "")),
        )
        for _, row in df.iterrows()
    ]
