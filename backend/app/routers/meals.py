from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
import gspread

from app.config import Settings, get_settings
from app.dependencies import get_current_user, get_sheets
from app.models.meal import CreateMealRequest, Meal, RsvpRequest
import app.services.discord_service as discord_service
import app.services.sheets_service as sheets_service

router = APIRouter(prefix="/meals", tags=["meals"])


@router.get("/", response_model=list[Meal])
def list_meals(
    _: str = Depends(get_current_user),
    sheets: gspread.Spreadsheet = Depends(get_sheets),
) -> list[Meal]:
    return sheets_service.get_meals(sheets)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_meal(
    body: CreateMealRequest,
    background_tasks: BackgroundTasks,
    _: str = Depends(get_current_user),
    sheets: gspread.Spreadsheet = Depends(get_sheets),
    settings: Settings = Depends(get_settings),
) -> None:
    sheets_service.create_meal(
        sheets,
        body.meal_name,
        body.time,
        body.location,
        body.cost,
        body.transport_needed,
    )
    transport_note = " 🚗 Transport needed!" if body.transport_needed else ""
    background_tasks.add_task(
        discord_service.send_notification,
        settings.discord_webhook_url,
        settings.app_url,
        "🍽️ New Meal Added",
        f"**{body.meal_name}** at {body.time}.{transport_note}",
    )


@router.post("/{meal_id}/rsvp", status_code=status.HTTP_204_NO_CONTENT)
def rsvp(
    meal_id: int,
    body: RsvpRequest,
    _: str = Depends(get_current_user),
    sheets: gspread.Spreadsheet = Depends(get_sheets),
) -> None:
    try:
        sheets_service.rsvp_meal(sheets, meal_id, body.user_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/{meal_id}/cancel-rsvp", status_code=status.HTTP_204_NO_CONTENT)
def cancel_rsvp(
    meal_id: int,
    body: RsvpRequest,
    _: str = Depends(get_current_user),
    sheets: gspread.Spreadsheet = Depends(get_sheets),
) -> None:
    try:
        sheets_service.cancel_meal_rsvp(sheets, meal_id, body.user_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(
    meal_id: int,
    _: str = Depends(get_current_user),
    sheets: gspread.Spreadsheet = Depends(get_sheets),
) -> None:
    try:
        sheets_service.delete_meal(sheets, meal_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
