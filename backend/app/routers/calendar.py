from fastapi import APIRouter, Depends
import gspread

from app.dependencies import get_current_user, get_sheets
from app.models.calendar import CalendarEvent
import app.services.sheets_service as sheets_service

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/", response_model=list[CalendarEvent])
def list_events(
    _: str = Depends(get_current_user),
    sheets: gspread.Spreadsheet = Depends(get_sheets),
) -> list[CalendarEvent]:
    return sheets_service.get_calendar(sheets)
