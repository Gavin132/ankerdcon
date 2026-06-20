from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
import gspread

from app.config import Settings, get_settings
from app.dependencies import get_current_user, get_sheets
from app.models.user import LocationPingRequest, User
import app.services.discord_service as discord_service
import app.services.sheets_service as sheets_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=list[User])
def list_users(
    _: str = Depends(get_current_user),
    sheets: gspread.Spreadsheet = Depends(get_sheets),
) -> list[User]:
    return sheets_service.get_users(sheets)


@router.put("/{user_name}/location", status_code=status.HTTP_204_NO_CONTENT)
def update_location(
    user_name: str,
    body: LocationPingRequest,
    background_tasks: BackgroundTasks,
    _: str = Depends(get_current_user),
    sheets: gspread.Spreadsheet = Depends(get_sheets),
    settings: Settings = Depends(get_settings),
) -> None:
    try:
        sheets_service.update_user_location(sheets, user_name, body.zone, body.text)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    background_tasks.add_task(
        discord_service.send_notification,
        settings.discord_webhook_url,
        settings.app_url,
        "📍 Location Updated",
        f"**{user_name}** is now at **{body.zone}**: {body.text}",
    )
