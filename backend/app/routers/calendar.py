from fastapi import APIRouter, Depends, HTTPException, status
import gspread

from app.dependencies import get_current_user, get_sheets
from app.models.calendar import CalendarEvent, CalendarRsvpRequest
import app.services.sheets_service as sheets_service

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/", response_model=list[CalendarEvent])
def list_events(
    _: str = Depends(get_current_user),
    sheets: gspread.Spreadsheet = Depends(get_sheets),
) -> list[CalendarEvent]:
    return sheets_service.get_calendar(sheets)


@router.post("/{event_id}/rsvp", status_code=status.HTTP_204_NO_CONTENT)
def rsvp_event(
    event_id: int,
    body: CalendarRsvpRequest,
    _: str = Depends(get_current_user),
    sheets: gspread.Spreadsheet = Depends(get_sheets),
) -> None:
    try:
        sheets_service.rsvp_calendar_event(sheets, event_id, body.user_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/{event_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_event(
    event_id: int,
    body: CalendarRsvpRequest,
    _: str = Depends(get_current_user),
    sheets: gspread.Spreadsheet = Depends(get_sheets),
) -> None:
    try:
        sheets_service.leave_calendar_event(sheets, event_id, body.user_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
