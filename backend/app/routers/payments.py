from fastapi import APIRouter, Depends, HTTPException, status

from app.constants import Tables
from app.core.logging import get_logger
from app.dependencies import get_current_user
from app.models.payment import CreatePaymentRequest, Payment
from app.routes import PaymentRoutes
from app.core.database import supabase

logger = get_logger(__name__)
router = APIRouter(prefix=PaymentRoutes.PREFIX, tags=["payments"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."


@router.get(PaymentRoutes.LIST, response_model=list[Payment])
def list_payments(_: str = Depends(get_current_user)) -> list[Payment]:
    try:
        return supabase.table(Tables.PAYMENTS).select("*").execute().data
    except Exception as e:
        logger.error("Failed to list payments: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(PaymentRoutes.LIST, status_code=status.HTTP_201_CREATED)
def create_payment(body: CreatePaymentRequest, _: str = Depends(get_current_user)) -> None:
    payment_data = {
        "paid_by": body.paid_by,
        "amount": body.amount,
        "description": body.description,
        "date": body.date,
        "splits": [s.model_dump() for s in body.splits],
    }
    try:
        supabase.table(Tables.PAYMENTS).insert(payment_data).execute()
    except Exception as e:
        logger.error("Failed to create payment: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.delete(PaymentRoutes.DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(payment_id: str, user_name: str, _: str = Depends(get_current_user)) -> None:
    try:
        payment = supabase.table(Tables.PAYMENTS).select("paid_by").eq("id", payment_id).single().execute()
    except Exception as e:
        logger.error("Failed to fetch payment %s: %s", payment_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not payment.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Betaling niet gevonden.")

    if payment.data.get("paid_by") != user_name:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Je kunt alleen je eigen betalingen verwijderen.")

    try:
        supabase.table(Tables.PAYMENTS).delete().eq("id", payment_id).execute()
    except Exception as e:
        logger.error("Failed to delete payment %s: %s", payment_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
