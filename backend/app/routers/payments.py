from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user
from app.models.payment import CreatePaymentRequest, Payment
from app.core.database import supabase

router = APIRouter(prefix="/payments", tags=["payments"])

@router.get("/", response_model=list[Payment])
def list_payments(_: str = Depends(get_current_user)) -> list[Payment]:
    response = supabase.table("payments").select("*").execute()
    return response.data


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_payment(
    body: CreatePaymentRequest,
    _: str = Depends(get_current_user),
) -> None:
    payment_data = {
        "paid_by": body.paid_by,
        "amount": body.amount,
        "description": body.description,
        "date": body.date,
        "splits": body.splits or []
    }
    supabase.table("payments").insert(payment_data).execute()


@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(
    payment_id: str,
    user_name: str,
    _: str = Depends(get_current_user),
) -> None:
    # 1. Fetch the payment to verify ownership before deleting
    payment = supabase.table("payments").select("paid_by").eq("id", payment_id).single().execute()
    
    if not payment.data:
        raise HTTPException(status_code=404, detail="Payment not found")
        
    # 2. Security Check: Only the person who created the payment can delete it
    if payment.data.get("paid_by") != user_name:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own payments.")
        
    # 3. Delete it!
    supabase.table("payments").delete().eq("id", payment_id).execute()