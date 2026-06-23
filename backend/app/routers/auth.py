from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
import gspread

from app.config import Settings, get_settings
from app.dependencies import get_sheets
from app.models.auth import LoginRequest, TokenResponse
import app.services.auth_service as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

_REFRESH_COOKIE = "ankerd_refresh"


@router.post("/login", response_model=TokenResponse)
def login(
    body: LoginRequest,
    response: Response,
    settings: Settings = Depends(get_settings),
    sheets: gspread.Spreadsheet = Depends(get_sheets),
) -> TokenResponse:
    if not auth_service.authenticate(body.user_name, body.passcode, sheets):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Onjuiste naam of toegangscode",
        )

    tokens = auth_service.issue_tokens(settings, body.user_name)

    response.set_cookie(
        key=_REFRESH_COOKIE,
        value=tokens["refresh_token"],
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=60 * 60 * 24 * settings.refresh_token_expire_days,
    )
    return TokenResponse(access_token=tokens["access_token"])


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    refresh_token: str | None = Cookie(default=None, alias=_REFRESH_COOKIE),
    settings: Settings = Depends(get_settings),
) -> TokenResponse:
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token"
        )
    try:
        access_token = auth_service.refresh_access_token(refresh_token, settings)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )
    return TokenResponse(access_token=access_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    response.delete_cookie(key=_REFRESH_COOKIE)
