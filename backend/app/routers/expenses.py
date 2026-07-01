# NOTE: No "from __future__ import annotations" — FastAPI 0.111 bug with 204 routes
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.constants import Tables
from app.dependencies import get_current_user
from app.models.expense import CreateExpenseRequest, Expense
from app.core.database import supabase
import app.services.discord_service as discord_service

router = APIRouter(prefix="/expenses", tags=["expenses"])


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/", response_model=list[Expense])
def list_expenses(_: str = Depends(get_current_user)):
    expenses = (
        supabase.table(Tables.EXPENSES)
        .select("*")
        .order("date", desc=True)
        .order("created_at", desc=True)
        .execute()
        .data
    )
    if not expenses:
        return []

    expense_ids = [e["id"] for e in expenses]
    shares = (
        supabase.table(Tables.EXPENSE_SHARES)
        .select("*")
        .in_("expense_id", expense_ids)
        .execute()
        .data
    )

    shares_by_expense: dict = {}
    for share in shares:
        eid = share["expense_id"]
        shares_by_expense.setdefault(eid, []).append(share)

    for expense in expenses:
        expense["shares"] = shares_by_expense.get(expense["id"], [])

    return expenses


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_expense(
    body: CreateExpenseRequest,
    background_tasks: BackgroundTasks,
    _: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    result = supabase.table(Tables.EXPENSES).insert({
        "paid_by":      body.paid_by,
        "amount":       body.amount,
        "currency":     body.currency,
        "description":  body.description,
        "date":         body.date,
    }).execute()

    expense_id = result.data[0]["id"]

    inserted_shares: list[dict] = []
    if body.shares:
        inserted_shares = (
            supabase.table(Tables.EXPENSE_SHARES)
            .insert([
                {"expense_id": expense_id, "participant": s.participant, "amount": s.amount}
                for s in body.shares
            ])
            .execute()
            .data
        )

    background_tasks.add_task(
        discord_service.notify_expense_created,
        settings.discord_webhook_url,
        settings.app_url,
        paid_by=body.paid_by,
        amount=body.amount,
        currency=body.currency,
        description=body.description,
        date=body.date,
        shares=[{"participant": s["participant"], "amount": s["amount"]} for s in inserted_shares],
    )


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: str, user_name: str, _: str = Depends(get_current_user)):
    row = (
        supabase.table(Tables.EXPENSES)
        .select("paid_by")
        .eq("id", expense_id)
        .single()
        .execute()
    )
    if not row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Uitgave niet gevonden.")
    if row.data["paid_by"] != user_name:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Alleen de betaler kan deze uitgave verwijderen.",
        )
    supabase.table(Tables.EXPENSES).delete().eq("id", expense_id).execute()


@router.post("/shares/{share_id}/claim")
def claim_share(share_id: str, _: str = Depends(get_current_user)):
    row = (
        supabase.table(Tables.EXPENSE_SHARES)
        .select("status")
        .eq("id", share_id)
        .single()
        .execute()
    )
    if not row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aandeel niet gevonden.")
    if row.data["status"] != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aandeel is al geclaimd of bevestigd.")
    supabase.table(Tables.EXPENSE_SHARES).update({
        "status": "claimed",
        "claimed_at": _utcnow(),
    }).eq("id", share_id).execute()
    return {"status": "claimed"}


@router.post("/shares/{share_id}/confirm")
def confirm_share(share_id: str, _: str = Depends(get_current_user)):
    row = (
        supabase.table(Tables.EXPENSE_SHARES)
        .select("status")
        .eq("id", share_id)
        .single()
        .execute()
    )
    if not row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aandeel niet gevonden.")
    if row.data["status"] != "claimed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aandeel is nog niet geclaimd.")
    supabase.table(Tables.EXPENSE_SHARES).update({
        "status": "confirmed",
        "confirmed_at": _utcnow(),
    }).eq("id", share_id).execute()
    return {"status": "confirmed"}
