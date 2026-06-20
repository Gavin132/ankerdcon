from fastapi import APIRouter, Depends, status
import gspread

from app.dependencies import get_current_user, get_sheets
from app.models.payment import CreatePaymentRequest, Payment
import app.services.sheets_service as sheets_service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/", response_model=list[Payment])
def list_payments(
    _: str = Depends(get_current_user),
    sheets: gspread.Spreadsheet = Depends(get_sheets),
) -> list[Payment]:
    return sheets_service.get_payments(sheets)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_payment(
    body: CreatePaymentRequest,
    _: str = Depends(get_current_user),
    sheets: gspread.Spreadsheet = Depends(get_sheets),
) -> None:
    sheets_service.create_payment(
        sheets, body.paid_by, body.amount, body.description, body.date
    )
