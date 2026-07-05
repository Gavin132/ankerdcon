# NOTE: No "from __future__ import annotations" — FastAPI 0.111 bug with 204 routes
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.constants import Tables
from app.core.logging import get_logger
from app.dependencies import get_current_user
from app.models.expense import CreateExpenseRequest, Expense
from app.routes import ExpenseRoutes
from app.core.database import supabase
import app.services.discord_service as discord_service

logger = get_logger(__name__)
router = APIRouter(prefix=ExpenseRoutes.PREFIX, tags=["expenses"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get(ExpenseRoutes.LIST, response_model=list[Expense])
def list_expenses(_: str = Depends(get_current_user)):
    try:
        expenses = (
            supabase.table(Tables.EXPENSES)
            .select("*")
            .order("date", desc=True)
            .order("created_at", desc=True)
            .execute()
            .data
        )
    except Exception as e:
        logger.error("Failed to list expenses: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not expenses:
        return []

    expense_ids = [e["id"] for e in expenses]
    try:
        shares = (
            supabase.table(Tables.EXPENSE_SHARES)
            .select("*")
            .in_("expense_id", expense_ids)
            .execute()
            .data
        )
    except Exception as e:
        logger.error("Failed to fetch expense shares: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    shares_by_expense: dict = {}
    for share in shares:
        eid = share["expense_id"]
        shares_by_expense.setdefault(eid, []).append(share)

    for expense in expenses:
        expense["shares"] = shares_by_expense.get(expense["id"], [])

    return expenses


@router.post(ExpenseRoutes.LIST, status_code=status.HTTP_201_CREATED)
def create_expense(
    body: CreateExpenseRequest,
    background_tasks: BackgroundTasks,
    _: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    try:
        result = supabase.table(Tables.EXPENSES).insert({
            "paid_by":      body.paid_by,
            "amount":       body.amount,
            "currency":     body.currency,
            "description":  body.description,
            "date":         body.date,
        }).execute()
    except Exception as e:
        logger.error("Failed to create expense: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not result.data:
        logger.error("Expense insert returned no data")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    expense_id = result.data[0]["id"]

    inserted_shares: list[dict] = []
    if body.shares:
        try:
            inserted_shares = (
                supabase.table(Tables.EXPENSE_SHARES)
                .insert([
                    {"expense_id": expense_id, "participant": s.participant, "amount": s.amount}
                    for s in body.shares
                ])
                .execute()
                .data
            )
        except Exception as e:
            logger.error("Failed to insert expense shares for expense %s: %s", expense_id, e)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

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


@router.delete(ExpenseRoutes.DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: str, user_name: str, _: str = Depends(get_current_user)):
    try:
        row = (
            supabase.table(Tables.EXPENSES)
            .select("paid_by")
            .eq("id", expense_id)
            .single()
            .execute()
        )
    except Exception as e:
        logger.error("Failed to fetch expense %s: %s", expense_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Uitgave niet gevonden.")
    if row.data["paid_by"] != user_name:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Alleen de betaler kan deze uitgave verwijderen.",
        )

    try:
        supabase.table(Tables.EXPENSES).delete().eq("id", expense_id).execute()
    except Exception as e:
        logger.error("Failed to delete expense %s: %s", expense_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(ExpenseRoutes.SHARE_CLAIM)
def claim_share(share_id: str, _: str = Depends(get_current_user)):
    try:
        row = (
            supabase.table(Tables.EXPENSE_SHARES)
            .select("status")
            .eq("id", share_id)
            .single()
            .execute()
        )
    except Exception as e:
        logger.error("Failed to fetch expense share %s: %s", share_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aandeel niet gevonden.")
    if row.data["status"] != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aandeel is al geclaimd of bevestigd.")

    try:
        supabase.table(Tables.EXPENSE_SHARES).update({
            "status": "claimed",
            "claimed_at": _utcnow(),
        }).eq("id", share_id).execute()
    except Exception as e:
        logger.error("Failed to claim expense share %s: %s", share_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    return {"status": "claimed"}


@router.post(ExpenseRoutes.SHARE_CONFIRM)
def confirm_share(share_id: str, _: str = Depends(get_current_user)):
    try:
        row = (
            supabase.table(Tables.EXPENSE_SHARES)
            .select("status")
            .eq("id", share_id)
            .single()
            .execute()
        )
    except Exception as e:
        logger.error("Failed to fetch expense share %s: %s", share_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aandeel niet gevonden.")
    if row.data["status"] != "claimed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aandeel is nog niet geclaimd.")

    try:
        supabase.table(Tables.EXPENSE_SHARES).update({
            "status": "confirmed",
            "confirmed_at": _utcnow(),
        }).eq("id", share_id).execute()
    except Exception as e:
        logger.error("Failed to confirm expense share %s: %s", share_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    return {"status": "confirmed"}
