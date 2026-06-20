from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
import gspread

from app.config import Settings, get_settings
from app.dependencies import get_current_user, get_sheets
from app.models.ride import ClaimSeatRequest, CreateRideRequest, Ride, LeaveSeatRequest
import app.services.discord_service as discord_service
import app.services.sheets_service as sheets_service

router = APIRouter(prefix="/rides", tags=["rides"])


@router.get("/", response_model=list[Ride])
def list_rides(
    direction: Optional[str] = None,
    _: str = Depends(get_current_user),
    sheets: gspread.Spreadsheet = Depends(get_sheets),
) -> list[Ride]:
    rides = sheets_service.get_rides(sheets)
    if direction:
        rides = [r for r in rides if r.direction.lower() == direction.lower()]
    return rides


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_ride(
    body: CreateRideRequest,
    background_tasks: BackgroundTasks,
    _: str = Depends(get_current_user),
    sheets: gspread.Spreadsheet = Depends(get_sheets),
    settings: Settings = Depends(get_settings),
) -> None:
    sheets_service.create_ride(
        sheets,
        body.direction,
        body.vehicle_type,
        body.driver,
        body.departure_time,
        body.start_location,
        body.total_seats,
        body.parking_info,
        body.maps_link,
    )
    is_timo = body.driver.strip().lower() == "timo"
    if body.vehicle_type == "Public Transport":
        icon = "🚆"
    elif is_timo:
        icon = "🚚"
    else:
        icon = "🚗"

    background_tasks.add_task(
        discord_service.send_notification,
        settings.discord_webhook_url,
        settings.app_url,
        "🚗 New Transport Added",
        f"{icon} New **{body.direction}** transport from **{body.start_location}** at **{body.departure_time}**.",
    )


@router.post("/{ride_id}/claim", status_code=status.HTTP_204_NO_CONTENT)
def claim_seat(
    ride_id: int,
    body: ClaimSeatRequest,
    _: str = Depends(get_current_user),
    sheets: gspread.Spreadsheet = Depends(get_sheets),
) -> None:
    try:
        sheets_service.claim_ride_seat(sheets, ride_id, body.user_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/{ride_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_seat(
    ride_id: int,
    body: LeaveSeatRequest,
    _: str = Depends(get_current_user),
    sheets: gspread.Spreadsheet = Depends(get_sheets),
) -> None:
    try:
        sheets_service.leave_ride_seat(sheets, ride_id, body.user_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
