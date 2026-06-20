from fastapi import APIRouter, Depends, HTTPException, status
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
        sheets, body.paid_by, body.amount, body.description, body.date, body.splits or []
    )


@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(
    payment_id: int,
    user_name: str,
    _: str = Depends(get_current_user),
    sheets: gspread.Spreadsheet = Depends(get_sheets),
) -> None:
    try:
        sheets_service.delete_payment(sheets, payment_id, user_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
