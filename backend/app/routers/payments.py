from fastapi import APIRouter, Depends, HTTPException, status

from app.constants import Tables
from app.dependencies import get_current_user
from app.models.payment import CreatePaymentRequest, Payment
from app.core.database import supabase

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/", response_model=list[Payment])
def list_payments(_: str = Depends(get_current_user)) -> list[Payment]:
    return supabase.table(Tables.PAYMENTS).select("*").execute().data


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_payment(body: CreatePaymentRequest, _: str = Depends(get_current_user)) -> None:
    payment_data = {
        "paid_by": body.paid_by,
        "amount": body.amount,
        "description": body.description,
        "date": body.date,
        "splits": [s.model_dump() for s in body.splits],
    }
    supabase.table(Tables.PAYMENTS).insert(payment_data).execute()


@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(payment_id: str, user_name: str, _: str = Depends(get_current_user)) -> None:
    payment = supabase.table(Tables.PAYMENTS).select("paid_by").eq("id", payment_id).single().execute()

    if not payment.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Betaling niet gevonden.")

    if payment.data.get("paid_by") != user_name:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Je kunt alleen je eigen betalingen verwijderen.")

    supabase.table(Tables.PAYMENTS).delete().eq("id", payment_id).execute()
