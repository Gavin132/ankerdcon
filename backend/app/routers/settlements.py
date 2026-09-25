# NOTE: No "from __future__ import annotations" — FastAPI 0.111 bug with 204 routes
"""
Settling up: one payment per pair of members instead of one per expense share.

A settlement covers every open share between two members in one currency
(netted, see app/services/settle_up.py). It goes:

    requested  — the receiver asked for the money (with a payment link or IBAN)
    claimed    — the payer says they've paid
    confirmed  — the receiver has the money; the covered shares are settled

A payer can also start at "claimed" (they just paid), and a receiver can go
straight to "confirmed" (cash in hand). Withdrawing a settlement before it's
confirmed puts its shares back to open.
"""
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlsplit

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app import messages as M
from app.config import Settings, get_settings
from app.constants import Tables
from app.core.database import supabase
from app.core.logging import get_logger
from app.dependencies import get_current_user
from app.models.settlement import (
    CreateSettlementRequest,
    Settlement,
    SettleUpItem,
    SettleUpOverview,
)
from app.routes import SettlementRoutes
from app.services import notification_service
from app.services.discord_bot import escape_markdown
from app.services.settle_up import (
    balance_between,
    build_name_resolver,
    normalize_iban,
    pair_balances,
)

logger = get_logger(__name__)
router = APIRouter(prefix=SettlementRoutes.PREFIX, tags=["settlements"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."
_OPEN = ("requested", "claimed")
# Confirmed settlements shown in the history, newest first.
_HISTORY_LIMIT = 20


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _db_error(what: str, e: Exception) -> HTTPException:
    logger.error("Settlements: failed to %s: %s", what, e)
    return HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


# ── Loading ───────────────────────────────────────────────────────────────────

def _profiles() -> list[dict]:
    try:
        return supabase.table(Tables.PROFILES).select("id, name, aliases, is_admin").execute().data or []
    except Exception as e:
        raise _db_error("fetch profiles", e)


def _me(profiles: list[dict], current_user: str) -> dict:
    for p in profiles:
        if p["name"] == current_user:
            return p
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profiel niet gevonden.")


def _expenses_with_open_shares() -> list[dict]:
    try:
        expenses = supabase.table(Tables.EXPENSES).select("id, paid_by, currency").execute().data or []
        shares = (
            supabase.table(Tables.EXPENSE_SHARES)
            .select("id, expense_id, participant, amount, status, settlement_id")
            .neq("status", "confirmed")
            .is_("settlement_id", "null")
            .execute()
            .data
            or []
        )
    except Exception as e:
        raise _db_error("fetch expenses", e)
    by_expense: dict[str, list[dict]] = {}
    for share in shares:
        by_expense.setdefault(share["expense_id"], []).append(share)
    for expense in expenses:
        expense["shares"] = by_expense.get(expense["id"], [])
    return expenses


def _settlement(settlement_id: str) -> dict:
    try:
        rows = supabase.table(Tables.SETTLEMENTS).select("*").eq("id", settlement_id).execute().data
    except Exception as e:
        raise _db_error(f"fetch settlement {settlement_id}", e)
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Afrekening niet gevonden.")
    return rows[0]


def _open_settlements_between(a: str, b: str, currency: str) -> list[dict]:
    try:
        rows = (
            supabase.table(Tables.SETTLEMENTS)
            .select("id, from_user_id, to_user_id, currency")
            .in_("status", list(_OPEN))
            .in_("from_user_id", [a, b])
            .in_("to_user_id", [a, b])
            .eq("currency", currency)
            .execute()
            .data
            or []
        )
    except Exception as e:
        raise _db_error("fetch open settlements", e)
    return rows


def _with_names(row: dict, names: dict[str, str]) -> dict:
    return {
        **row,
        "from_user": names.get(row["from_user_id"], "Onbekend"),
        "to_user": names.get(row["to_user_id"], "Onbekend"),
    }


def _update_shares(settlement_id: str, updates: dict) -> None:
    try:
        supabase.table(Tables.EXPENSE_SHARES).update(updates).eq("settlement_id", settlement_id).execute()
    except Exception as e:
        raise _db_error(f"update shares of settlement {settlement_id}", e)


# ── Validation ────────────────────────────────────────────────────────────────

def _valid_request_url(raw: Optional[str]) -> Optional[str]:
    url = (raw or "").strip()
    if not url:
        return None
    parts = urlsplit(url)
    if parts.scheme != "https" or not parts.hostname or " " in url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="De betaallink moet een volledige https-link zijn.",
        )
    return url


def _valid_iban(raw: Optional[str]) -> Optional[str]:
    if not (raw or "").strip():
        return None
    iban = normalize_iban(raw)
    if not iban:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dit IBAN klopt niet.")
    return iban


# ── Notifications ─────────────────────────────────────────────────────────────

def _link_line(settings: Settings, settlement_id: Optional[str] = None) -> str:
    """Our own app link (never a member-supplied one) for the end of a DM."""
    base = (settings.app_url or "").rstrip("/")
    if not base:
        return ""
    return f"\n{base}/finance?settle={settlement_id}" if settlement_id else f"\n{base}/finance"


def _dm(background_tasks: BackgroundTasks, settings: Settings, profile_id: str, content: str) -> None:
    background_tasks.add_task(
        notification_service.send_personal_dm, settings.discord_bot_token, profile_id, content
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(SettlementRoutes.LIST, response_model=SettleUpOverview)
def overview(current_user: str = Depends(get_current_user)):
    """What's open between you and each other member, plus your settlements."""
    profiles = _profiles()
    me = _me(profiles, current_user)["id"]
    names = {p["id"]: p["name"] for p in profiles}

    try:
        rows = (
            supabase.table(Tables.SETTLEMENTS)
            .select("*")
            .or_(f"from_user_id.eq.{me},to_user_id.eq.{me}")
            .order("created_at", desc=True)
            .execute()
            .data
            or []
        )
    except Exception as e:
        raise _db_error("list settlements", e)

    open_rows = [r for r in rows if r["status"] in _OPEN]
    history = [r for r in rows if r["status"] == "confirmed"][:_HISTORY_LIMIT]
    busy_pairs = {
        (frozenset((r["from_user_id"], r["to_user_id"])), r["currency"]) for r in open_rows
    }

    items: list[SettleUpItem] = []
    resolve = build_name_resolver(profiles)
    for bal in pair_balances(_expenses_with_open_shares(), resolve):
        if me not in (bal.debtor_id, bal.creditor_id):
            continue
        other = bal.creditor_id if bal.debtor_id == me else bal.debtor_id
        direction = "even" if bal.amount_cents == 0 else ("i_owe" if bal.debtor_id == me else "owes_me")
        items.append(SettleUpItem(
            counterparty_id=other,
            counterparty=names.get(other, "Onbekend"),
            direction=direction,
            amount=bal.amount_cents / 100,
            currency=bal.currency,
            share_count=len(bal.share_ids),
            blocked_by_settlement=(frozenset((me, other)), bal.currency) in busy_pairs,
        ))
    items.sort(key=lambda i: -i.amount)

    return SettleUpOverview(
        items=items,
        settlements=[Settlement(**_with_names(r, names)) for r in open_rows + history],
    )


@router.post(SettlementRoutes.LIST, status_code=status.HTTP_201_CREATED, response_model=Settlement)
def create_settlement(
    body: CreateSettlementRequest,
    background_tasks: BackgroundTasks,
    current_user: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    profiles = _profiles()
    me = _me(profiles, current_user)["id"]
    names = {p["id"]: p["name"] for p in profiles}
    other = body.counterparty_id
    if other not in names or other == me:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kies iemand anders om mee af te rekenen.")

    if _open_settlements_between(me, other, body.currency):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Er loopt al een afrekening tussen jullie. Rond die eerst af.",
        )

    bal = balance_between(pair_balances(_expenses_with_open_shares(), build_name_resolver(profiles)), me, other, body.currency)
    if not bal:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Er staat niets open tussen jullie.")

    now = _utcnow()
    request_url = iban = account_name = None
    if bal.amount_cents == 0:
        # Debts in both directions cancel out: nothing to pay, just strike them off.
        new_status = "confirmed"
    elif body.action == "paid":
        if bal.debtor_id != me:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{names[other]} is jou geld schuldig, niet andersom.")
        new_status = "claimed"
    else:
        if bal.creditor_id != me:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Jij bent {names[other]} geld schuldig, niet andersom.")
        if body.action == "received":
            new_status = "confirmed"
        else:
            new_status = "requested"
            request_url = _valid_request_url(body.request_url)
            iban = _valid_iban(body.iban)
            account_name = (body.account_name or "").strip() or None
            if not request_url and not iban:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Voeg een betaallink of IBAN toe, zodat de ander weet hoe te betalen.",
                )

    try:
        inserted = supabase.table(Tables.SETTLEMENTS).insert({
            "from_user_id": bal.debtor_id,
            "to_user_id":   bal.creditor_id,
            "amount":       bal.amount_cents / 100,
            "currency":     bal.currency,
            "status":       new_status,
            "request_url":  request_url,
            "iban":         iban,
            "account_name": account_name,
            "created_by":   me,
            "claimed_at":   now if new_status == "claimed" else None,
            "confirmed_at": now if new_status == "confirmed" else None,
        }).execute().data
    except Exception as e:
        # Two requests for the same pair at once: the unique index on open
        # settlements (migration v2.26) lets exactly one through.
        if "23505" in str(e) or "duplicate key" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Er loopt al een afrekening tussen jullie. Rond die eerst af.",
            )
        raise _db_error("create settlement", e)
    if not inserted:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    row = inserted[0]

    share_updates: dict = {"settlement_id": row["id"]}
    if new_status == "claimed":
        share_updates |= {"status": "claimed", "claimed_at": now}
    elif new_status == "confirmed":
        share_updates |= {"status": "confirmed", "confirmed_at": now}
    try:
        attached = (
            supabase.table(Tables.EXPENSE_SHARES)
            .update(share_updates)
            .in_("id", bal.share_ids)
            .is_("settlement_id", "null")
            .neq("status", "confirmed")
            .execute()
            .data
            or []
        )
    except Exception as e:
        # Don't leave a settlement behind that covers nothing.
        supabase.table(Tables.SETTLEMENTS).delete().eq("id", row["id"]).execute()
        raise _db_error(f"attach shares to settlement {row['id']}", e)
    if len(attached) != len(bal.share_ids):
        # A share was settled or changed by someone else in between, so the
        # amount no longer matches what this settlement covers. Undo it.
        _update_shares(row["id"], {"settlement_id": None, "status": "pending", "claimed_at": None, "confirmed_at": None})
        supabase.table(Tables.SETTLEMENTS).delete().eq("id", row["id"]).execute()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Er is net iets veranderd aan jullie uitgaven. Probeer het opnieuw.",
        )

    fmt = {"amount": float(row["amount"]), "currency": escape_markdown(row["currency"])}
    if bal.amount_cents > 0:
        if new_status == "requested":
            _dm(background_tasks, settings, other, M.DM_SETTLEMENT_REQUESTED.format(
                creditor=escape_markdown(names[me]), link_line=_link_line(settings, row["id"]), **fmt))
        elif new_status == "claimed":
            _dm(background_tasks, settings, other, M.DM_SETTLEMENT_PAID.format(
                debtor=escape_markdown(names[me]), link_line=_link_line(settings, row["id"]), **fmt))
        else:
            _dm(background_tasks, settings, other, M.DM_SETTLEMENT_CONFIRMED.format(
                creditor=escape_markdown(names[me]), **fmt))

    return Settlement(**_with_names(row, names))


@router.post(SettlementRoutes.PAID)
def mark_paid(
    settlement_id: str,
    background_tasks: BackgroundTasks,
    current_user: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """The payer says they've paid a request."""
    profiles = _profiles()
    me = _me(profiles, current_user)
    row = _settlement(settlement_id)
    if row["from_user_id"] != me["id"] and not me.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Alleen de betaler kan dit melden.")
    if row["status"] != "requested":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Deze afrekening is al betaald of bevestigd.")

    now = _utcnow()
    try:
        supabase.table(Tables.SETTLEMENTS).update({"status": "claimed", "claimed_at": now}).eq("id", settlement_id).execute()
    except Exception as e:
        raise _db_error(f"claim settlement {settlement_id}", e)
    _update_shares(settlement_id, {"status": "claimed", "claimed_at": now})

    names = {p["id"]: p["name"] for p in profiles}
    _dm(background_tasks, settings, row["to_user_id"], M.DM_SETTLEMENT_PAID.format(
        debtor=escape_markdown(names.get(row["from_user_id"], "Iemand")),
        amount=float(row["amount"]), currency=escape_markdown(row["currency"]),
        link_line=_link_line(settings, settlement_id),
    ))
    return {"status": "claimed"}


@router.post(SettlementRoutes.CONFIRM)
def confirm(
    settlement_id: str,
    background_tasks: BackgroundTasks,
    current_user: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """The receiver has the money — settles every share the settlement covers."""
    profiles = _profiles()
    me = _me(profiles, current_user)
    row = _settlement(settlement_id)
    if row["to_user_id"] != me["id"] and not me.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Alleen de ontvanger kan dit bevestigen.")
    if row["status"] == "confirmed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Deze afrekening is al bevestigd.")

    now = _utcnow()
    try:
        supabase.table(Tables.SETTLEMENTS).update({
            "status": "confirmed",
            "confirmed_at": now,
            # How to pay was only needed until now; don't keep bank details around.
            "request_url": None,
            "iban": None,
            "account_name": None,
        }).eq("id", settlement_id).execute()
    except Exception as e:
        raise _db_error(f"confirm settlement {settlement_id}", e)
    _update_shares(settlement_id, {"status": "confirmed", "confirmed_at": now})

    names = {p["id"]: p["name"] for p in profiles}
    _dm(background_tasks, settings, row["from_user_id"], M.DM_SETTLEMENT_CONFIRMED.format(
        creditor=escape_markdown(names.get(row["to_user_id"], "Iemand")),
        amount=float(row["amount"]), currency=escape_markdown(row["currency"]),
    ))
    return {"status": "confirmed"}


@router.delete(SettlementRoutes.DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def withdraw(
    settlement_id: str,
    background_tasks: BackgroundTasks,
    current_user: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """Withdraw a request or a payment, or (as the receiver) say it never
    arrived. The covered shares go back to open."""
    profiles = _profiles()
    me = _me(profiles, current_user)
    row = _settlement(settlement_id)
    if me["id"] not in (row["from_user_id"], row["to_user_id"]) and not me.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Dit is niet jouw afrekening.")
    if row["status"] == "confirmed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Een bevestigde afrekening kan niet meer worden ingetrokken.")

    _update_shares(settlement_id, {
        "settlement_id": None, "status": "pending", "claimed_at": None, "confirmed_at": None,
    })
    try:
        supabase.table(Tables.SETTLEMENTS).delete().eq("id", settlement_id).execute()
    except Exception as e:
        raise _db_error(f"delete settlement {settlement_id}", e)

    names = {p["id"]: p["name"] for p in profiles}
    fmt = {"amount": float(row["amount"]), "currency": escape_markdown(row["currency"])}
    receiver_rejects = me["id"] == row["to_user_id"] and row["status"] == "claimed"
    if receiver_rejects:
        _dm(background_tasks, settings, row["from_user_id"], M.DM_SETTLEMENT_NOT_RECEIVED.format(
            creditor=escape_markdown(names.get(row["to_user_id"], "Iemand")),
            link_line=_link_line(settings), **fmt))
    else:
        other = row["to_user_id"] if me["id"] == row["from_user_id"] else row["from_user_id"]
        _dm(background_tasks, settings, other, M.DM_SETTLEMENT_CANCELLED.format(
            name=escape_markdown(me["name"]),
            link_line=_link_line(settings), **fmt))
