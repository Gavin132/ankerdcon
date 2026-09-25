"""
Settling up: who still owes whom, netted per pair of members.

An expense share says "participant owes the payer this much". Between any two
members those debts can run both ways (Timo paid for dinner, Bob paid for
parking), so they're netted into one amount per pair and currency. Settling
that pair covers every share between the two of them at once — nobody is
ever asked to pay someone they never owed.

Pure functions only (no database), so they can be tested on their own.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Iterable, Optional


@dataclass
class PairBalance:
    debtor_id: str
    creditor_id: str
    currency: str
    amount_cents: int  # 0 when the debts in both directions cancel out exactly
    share_ids: list[str] = field(default_factory=list)


def build_name_resolver(profiles: Iterable[dict]) -> Callable[[str], Optional[str]]:
    """Map a name as stored on an expense or share to a profile id.

    Expenses and shares store names, and older rows keep someone's name from
    before a rename. A former name (alias) only counts while no other profile
    goes by it and no one else lists it — the same rule acting-as uses.
    """
    by_name: dict[str, str] = {}
    for p in profiles:
        by_name[p["name"]] = p["id"]

    alias_owner: dict[str, Optional[str]] = {}
    for p in profiles:
        for alias in p.get("aliases") or []:
            if alias in by_name:
                continue
            # Claimed by two profiles: ambiguous, so it resolves to nobody.
            alias_owner[alias] = p["id"] if alias not in alias_owner else None

    def resolve(name: str) -> Optional[str]:
        if name in by_name:
            return by_name[name]
        return alias_owner.get(name)

    return resolve


def is_open(share: dict) -> bool:
    """Still to be settled, and not already part of a settlement in progress."""
    return share.get("status") != "confirmed" and not share.get("settlement_id")


def pair_balances(
    expenses: Iterable[dict],
    resolve: Callable[[str], Optional[str]],
) -> list[PairBalance]:
    """Net every open share into one balance per pair of members and currency.

    `expenses` carry their shares under "shares". Shares whose names don't
    resolve to a profile, or where the participant is the payer, are skipped.
    """
    # Keyed by (lower id, higher id, currency); positive = lower id owes higher id.
    nets: dict[tuple[str, str, str], int] = {}
    ids: dict[tuple[str, str, str], list[str]] = {}

    for expense in expenses:
        payer = resolve(expense["paid_by"])
        if not payer:
            continue
        currency = expense.get("currency") or "EUR"
        for share in expense.get("shares") or []:
            if not is_open(share):
                continue
            participant = resolve(share["participant"])
            if not participant or participant == payer:
                continue
            a, b = sorted((participant, payer))
            key = (a, b, currency)
            cents = round(float(share["amount"]) * 100)
            nets[key] = nets.get(key, 0) + (cents if participant == a else -cents)
            ids.setdefault(key, []).append(share["id"])

    balances: list[PairBalance] = []
    for (a, b, currency), net in nets.items():
        debtor, creditor = (a, b) if net >= 0 else (b, a)
        balances.append(PairBalance(debtor, creditor, currency, abs(net), ids[(a, b, currency)]))
    return balances


def balance_between(
    balances: Iterable[PairBalance], user_a: str, user_b: str, currency: str
) -> Optional[PairBalance]:
    for bal in balances:
        if bal.currency == currency and {bal.debtor_id, bal.creditor_id} == {user_a, user_b}:
            return bal
    return None


_IBAN_LENGTHS = {"NL": 18, "BE": 16, "DE": 22, "FR": 27, "LU": 20, "AT": 20, "ES": 24, "IT": 27, "GB": 22, "IE": 22}


def normalize_iban(raw: str) -> Optional[str]:
    """Return the IBAN without spaces and in capitals, or None if it's not valid."""
    iban = "".join(raw.split()).upper()
    if not (15 <= len(iban) <= 34) or not iban[:2].isalpha() or not iban[2:4].isdigit() or not iban.isalnum():
        return None
    expected = _IBAN_LENGTHS.get(iban[:2])
    if expected and len(iban) != expected:
        return None
    rearranged = iban[4:] + iban[:4]
    digits = "".join(str(int(c, 36)) for c in rearranged)
    return iban if int(digits) % 97 == 1 else None
