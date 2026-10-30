"""Merging a placeholder profile into a real member.

An admin creates a placeholder for someone who has not logged in yet, so that person can already be
put on rides, meals and expenses. When the real member finally logs in they get a profile of their
own, and an admin folds the placeholder into it by hand (Admin > Gebruikers > "Voeg samen met...").

What a profile is in the data:
  * its id, in `settlements` (from, to, created_by), and
  * its NAME (and former names, `aliases`), written into arrays and text columns all over the
    place: passengers, participants, occupants, restaurant cars, paid_by, uploaded_by, ...

`plan_merge` reads all of it and works out every change (counts for the preview, plus one write per
change), `execute` runs them. There is no database transaction here (Supabase's REST client has
none), so the order is chosen so that a failure never loses anything:

  1. every change is a rename "placeholder name -> member name", which is idempotent: running the
     merge again after a failure picks up where it stopped, because the placeholder still exists;
  2. the placeholder profile is deleted only after all of that, so nothing is left pointing at a
     profile that is gone (settlements would even be deleted with it, `ON DELETE CASCADE`);
  3. the placeholder's name is added to the member's `aliases` last, after the delete, because an
     alias that belongs to another profile is rejected everywhere else (`_names_claimed_by_others`)
     and the name resolver treats a name as the profile's own while that profile exists.

Lists are changed with `update_list` (compare-and-swap), so someone signing up at the same moment
is not overwritten.
"""
from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Callable

from fastapi import HTTPException, status

from app.constants import Tables
from app.core.atomic import update_list
from app.core.database import supabase
from app.core.logging import get_logger

logger = get_logger(__name__)

_DB_ERROR = "Databasefout. Probeer het opnieuw."
_HALFWAY = (
    "Het samenvoegen is halverwege mislukt. Er is niets verloren: "
    "probeer het nog een keer, dan gaat het verder waar het bleef."
)

# What a login leaves on a profile. A placeholder is made by an admin and has none of it.
_LOGIN_FIELDS = ("email", "discord_username", "avatar_url")


def is_placeholder(profile: dict) -> bool:
    """A profile nobody has ever logged in to.

    Every login fills in who the member is, from what Discord or Google verified: an email address
    (Google), a Discord username and an avatar (Discord; Google gives an avatar too). An admin-made
    profile has none of these and impersonating it ("log in as") never fills them in either, because
    there is no auth account behind it. `is_first_login` is NOT used: impersonating a placeholder
    clears it. `discord_id` is NOT used either: an admin may type one in ahead of time, and that
    profile still has not logged in.

    This is the same idea as `_claim_stub_profile` in `app/dependencies.py` (a Discord login claims a
    stub with no discord_id and no email); that one has to ask the database, this one reads a row.
    """
    return not any(profile.get(f) for f in _LOGIN_FIELDS)


# ── The result ────────────────────────────────────────────────────────────────

# What `counts` holds, in the order the app shows them.
KINDS = (
    "rides", "meals", "trip_days", "hotel_rooms", "expenses", "expense_shares", "settlements",
    "cosplays", "photos", "stories_seen", "ride_costs", "parking_spots", "feedback",
    "push_subscriptions", "badges", "ticket_votes",
)
# What was thrown away instead of moved, because it would have been a duplicate or a payment to oneself.
DROPPED_KINDS = ("settlements", "ride_costs", "parking_spots", "restaurant_cars")


@dataclass
class MergePlan:
    source: dict
    target: dict
    names: list[str]                       # the placeholder's names that are replaced
    counts: dict[str, int] = field(default_factory=lambda: {k: 0 for k in KINDS})
    dropped: dict[str, int] = field(default_factory=lambda: {k: 0 for k in DROPPED_KINDS})
    ops: list[Callable[[], None]] = field(default_factory=list)
    alias_names: list[str] = field(default_factory=list)
    badge_ids: list[str] = field(default_factory=list)

    def summary(self) -> dict:
        return {
            "source_name": self.source["name"],
            "target_name": self.target["name"],
            "counts": self.counts,
            "dropped": self.dropped,
            "alias_names": self.alias_names,
        }


# ── Small helpers ─────────────────────────────────────────────────────────────

def _is_missing_table(error: Exception) -> bool:
    text = str(error)
    return any(marker in text for marker in ("PGRST205", "PGRST204", "42P01", "does not exist", "schema cache"))


def _select(table: str, columns: str, *, optional: bool = False, where: Callable[[Any], Any] | None = None) -> list[dict]:
    """All rows of a table. `optional` is for tables added by a later migration: when the migration
    has not been run there is nothing to merge in it. Any other failure stops the merge."""
    try:
        query = supabase.table(table).select(columns)
        if where:
            query = where(query)
        return query.execute().data or []
    except Exception as e:
        if optional and _is_missing_table(e):
            logger.info("Merge: table %s does not exist (yet), skipping it", table)
            return []
        logger.error("Merge: failed to read %s: %s", table, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


def _write(what: str, call: Callable[[], Any]) -> None:
    try:
        call()
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Merge: failed to %s: %s", what, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_HALFWAY)


def _swap(names: list[str] | None, old: set[str], new: str, same: set[str] | None = None) -> list[str] | None:
    """`names` with the placeholder's name replaced by the member's, each person once. None when the
    placeholder is not in the list. If the member is already in it (under their name or a former name,
    `same`), the placeholder's entry is simply removed, so the person is not on the list twice."""
    names = list(names or [])
    if not any(n in old for n in names):
        return None
    already = any(n in (same or {new}) for n in names)
    out = list(dict.fromkeys(
        new if n in old else n for n in names if not (n in old and already)
    ))
    return out if out != names else None


def _swap_cars(cars: list[dict] | None, old: set[str], new: str, same: set[str] | None = None) -> list[dict] | None:
    """The same for a restaurant ride's cars (`[{name, seats, passengers}]`). A placeholder who drove a
    car becomes the member's car; when the member already has a car on that ride the two cars are one:
    passengers are joined and the larger seat count wins. A driver rides in their own car only."""
    cars = [c for c in (cars or []) if isinstance(c, dict)]
    if not any(c.get("name") in old or any(p in old for p in c.get("passengers") or []) for c in cars):
        return None
    out: list[dict] = []
    for car in cars:
        car = dict(car)
        car["passengers"] = _swap(car.get("passengers"), old, new, same) or list(car.get("passengers") or [])
        if car.get("name") in old:
            car["name"] = new
        # (not called `same`: that is the set of the member's names, still needed for the next car)
        twin = next((c for c in out if c.get("name") == new), None) if car["name"] == new else None
        if twin is not None:
            twin["passengers"] = list(dict.fromkeys([*twin["passengers"], *car["passengers"]]))
            twin["seats"] = max(twin.get("seats") or 0, car.get("seats") or 0)
            continue
        out.append(car)
    if any(c.get("name") == new for c in out):
        for c in out:
            if c.get("name") != new:
                c["passengers"] = [p for p in c["passengers"] if p != new]
    return out if json.dumps(out, sort_keys=True) != json.dumps(cars, sort_keys=True) else None


@dataclass
class _Ctx:
    plan: MergePlan
    old: set[str]
    new: str
    source_id: str
    target_id: str
    same: set[str]   # every name the member goes by: current and former

    @property
    def old_list(self) -> list[str]:
        return sorted(self.old)


# ── Planning, one kind at a time ──────────────────────────────────────────────

def _plan_lists(ctx: _Ctx) -> None:
    """Name lists: ride passengers and cars, meal sign-ups, trip days, hotel rooms."""
    plan, old, new = ctx.plan, ctx.old, ctx.new

    def list_op(table: str, row_id: str, column: str, jsonb: bool = False, swap=_swap):
        def run() -> None:
            update_list(table, row_id, column, lambda current, _row: swap(current, old, new, ctx.same), jsonb=jsonb)
        return run

    def column_op(table: str, row_id: str, column: str, value: str):
        def run() -> None:
            _write(f"rename {table}.{column}", lambda: (
                supabase.table(table).update({column: new}).eq("id", row_id).eq(column, value).execute()
            ))
        return run

    for ride in _select(Tables.RIDES, "id, driver, passengers, restaurant_drivers"):
        ops: list[Callable[[], None]] = []
        if ride.get("driver") in old:
            ops.append(column_op(Tables.RIDES, ride["id"], "driver", ride["driver"]))
        if _swap(ride.get("passengers"), old, new, ctx.same) is not None:
            ops.append(list_op(Tables.RIDES, ride["id"], "passengers"))
        cars = _swap_cars(ride.get("restaurant_drivers"), old, new, ctx.same)
        if cars is not None:
            ops.append(list_op(Tables.RIDES, ride["id"], "restaurant_drivers", jsonb=True, swap=_swap_cars))
            if sum(1 for c in ride.get("restaurant_drivers") or [] if c.get("name") in old | {new}) > 1:
                plan.dropped["restaurant_cars"] += 1
        if ops:
            plan.counts["rides"] += 1
            plan.ops.extend(ops)

    for meal in _select(Tables.MEALS, "id, participants, created_by"):
        ops = []
        if _swap(meal.get("participants"), old, new, ctx.same) is not None:
            ops.append(list_op(Tables.MEALS, meal["id"], "participants"))
        if meal.get("created_by") in old:
            ops.append(column_op(Tables.MEALS, meal["id"], "created_by", meal["created_by"]))
        if ops:
            plan.counts["meals"] += 1
            plan.ops.extend(ops)

    for day in _select(Tables.EVENT_DAYS, "id, participants"):
        if _swap(day.get("participants"), old, new, ctx.same) is not None:
            plan.counts["trip_days"] += 1
            plan.ops.append(list_op(Tables.EVENT_DAYS, day["id"], "participants"))

    for room in _select(Tables.HOTEL_ROOMS, "id, occupants"):
        if _swap(room.get("occupants"), old, new, ctx.same) is not None:
            plan.counts["hotel_rooms"] += 1
            plan.ops.append(list_op(Tables.HOTEL_ROOMS, room["id"], "occupants"))


def _plan_renames(ctx: _Ctx) -> None:
    """Text columns that hold a name and have nothing unique about them."""
    plan, old, new = ctx.plan, ctx.old, ctx.new
    for table, column, kind, optional in (
        (Tables.COSPLAYS, "user_name", "cosplays", False),
        (Tables.STORY_PHOTOS, "uploaded_by", "photos", False),
        (Tables.FEEDBACK, "user_name", "feedback", True),
        (Tables.PUSH_SUBSCRIPTIONS, "user_name", "push_subscriptions", True),
    ):
        rows = _select(table, f"id, {column}", optional=optional, where=lambda q, c=column: q.in_(c, ctx.old_list))
        if not rows:
            continue
        plan.counts[kind] += len(rows)
        plan.ops.append(lambda t=table, c=column: _write(f"rename {t}.{c}", lambda: (
            supabase.table(t).update({c: new}).in_(c, ctx.old_list).execute()
        )))


def _plan_ticket_votes(ctx: _Ctx) -> None:
    """A member has one vote per ticket vote: the placeholder's is dropped when the member voted too, else
    it is renamed. The buyer of a vote is renamed without being counted (it is a name on a card, not something
    the member did)."""
    plan, old, new = ctx.plan, ctx.old, ctx.new
    rows = _select(
        Tables.TICKET_VOTES, "id, poll_id, voter", optional=True,
        where=lambda q: q.in_("voter", [*ctx.old_list, new]),
    )
    taken = {r["poll_id"] for r in rows if r["voter"] == new}
    for row in (r for r in rows if r["voter"] in old):
        plan.counts["ticket_votes"] += 1
        if row["poll_id"] in taken:
            plan.ops.append(lambda i=row["id"]: _write("drop duplicate ticket vote", lambda: (
                supabase.table(Tables.TICKET_VOTES).delete().eq("id", i).execute()
            )))
        else:
            taken.add(row["poll_id"])
            plan.ops.append(lambda i=row["id"]: _write("rename ticket_votes.voter", lambda: (
                supabase.table(Tables.TICKET_VOTES).update({"voter": new}).eq("id", i).execute()
            )))
    if _select(Tables.TICKET_POLLS, "id", optional=True, where=lambda q: q.in_("buyer", ctx.old_list)):
        plan.ops.append(lambda: _write("rename ticket_polls.buyer", lambda: (
            supabase.table(Tables.TICKET_POLLS).update({"buyer": new}).in_("buyer", ctx.old_list).execute()
        )))


def _plan_per_trip(ctx: _Ctx) -> None:
    """One row per (trip, driver): a member cannot have two, so the placeholder's row is dropped when the
    member already has one for that trip. Same for what a member has watched of a day's story."""
    plan, old, new = ctx.plan, ctx.old, ctx.new

    # A parking pin is also remembered by who placed it.
    placed = _select(Tables.PARKING_SPOTS, "id", optional=True, where=lambda q: q.in_("placed_by", ctx.old_list))
    pinned = {r["id"] for r in placed}
    if placed:
        plan.ops.append(lambda: _write("rename parking_spots.placed_by", lambda: (
            supabase.table(Tables.PARKING_SPOTS).update({"placed_by": new}).in_("placed_by", ctx.old_list).execute()
        )))

    for table, kind in ((Tables.RIDE_COSTS, "ride_costs"), (Tables.PARKING_SPOTS, "parking_spots")):
        rows = _select(table, "id, trip_id, driver", optional=True, where=lambda q: q.in_("driver", [*ctx.old_list, new]))
        taken = {r["trip_id"] for r in rows if r["driver"] == new}
        for row in (r for r in rows if r["driver"] in old):
            plan.counts[kind] += 1
            pinned.discard(row["id"])
            if row["trip_id"] in taken:
                plan.dropped[kind] += 1
                plan.ops.append(lambda t=table, i=row["id"]: _write(f"drop duplicate {t} row", lambda: (
                    supabase.table(t).delete().eq("id", i).execute()
                )))
            else:
                taken.add(row["trip_id"])
                plan.ops.append(lambda t=table, i=row["id"]: _write(f"rename {t}.driver", lambda: (
                    supabase.table(t).update({"driver": new}).eq("id", i).execute()
                )))

    plan.counts["parking_spots"] += len(pinned)  # placed by the placeholder, driven by someone else

    seen = _select(
        Tables.STORY_SEEN, "user_name, event_day_id, last_seen_seq", optional=True,
        where=lambda q: q.in_("user_name", [*ctx.old_list, new]),
    )
    mine = {r["event_day_id"]: r for r in seen if r["user_name"] == new}
    for row in (r for r in seen if r["user_name"] in old):
        plan.counts["stories_seen"] += 1
        day, name = row["event_day_id"], row["user_name"]
        existing = mine.get(day)
        if existing is None:
            mine[day] = row
            plan.ops.append(lambda d=day, n=name: _write("rename story_seen.user_name", lambda: (
                supabase.table(Tables.STORY_SEEN).update({"user_name": new}).eq("user_name", n).eq("event_day_id", d).execute()
            )))
            continue
        furthest = max(existing.get("last_seen_seq") or 0, row.get("last_seen_seq") or 0)
        plan.ops.append(lambda d=day, n=name, f=furthest: _write("merge story_seen rows", lambda: (
            supabase.table(Tables.STORY_SEEN).update({"last_seen_seq": f}).eq("user_name", new).eq("event_day_id", d).execute(),
            supabase.table(Tables.STORY_SEEN).delete().eq("user_name", n).eq("event_day_id", d).execute(),
        )))


_OPEN = ("requested", "claimed")


def _plan_settlements(ctx: _Ctx) -> set[str]:
    """Settlements are keyed by profile id and cascade-delete with the profile, so they are moved to the
    member first. One between the two of them is dropped (it would be a payment to oneself). Returns the
    ids of the dropped ones, which the expense shares must let go of."""
    plan, src, tgt = ctx.plan, ctx.source_id, ctx.target_id
    rows = _select(
        Tables.SETTLEMENTS, "id, from_user_id, to_user_id, currency, status, created_by",
        where=lambda q: q.or_(f"from_user_id.eq.{src},to_user_id.eq.{src},created_by.eq.{src}"),
    )
    if not rows:
        return set()
    members = _select(
        Tables.SETTLEMENTS, "id, from_user_id, to_user_id, currency, status",
        where=lambda q: q.or_(f"from_user_id.eq.{tgt},to_user_id.eq.{tgt}"),
    )
    open_with_target = {
        (r["to_user_id"] if r["from_user_id"] == tgt else r["from_user_id"], r["currency"])
        for r in members if r["status"] in _OPEN
    }

    dropped: set[str] = set()
    for row in rows:
        sid = row["id"]
        involved = src in (row["from_user_id"], row["to_user_id"])
        other = row["to_user_id"] if row["from_user_id"] == src else row["from_user_id"]
        if involved and other == tgt:
            dropped.add(sid)
            plan.dropped["settlements"] += 1
            continue
        update: dict[str, str] = {}
        if row["from_user_id"] == src:
            update["from_user_id"] = tgt
        if row["to_user_id"] == src:
            update["to_user_id"] = tgt
        if row.get("created_by") == src:
            update["created_by"] = tgt
        if involved and row["status"] in _OPEN:
            if (other, row["currency"]) in open_with_target:
                _raise_settlement_clash(ctx, other)
            open_with_target.add((other, row["currency"]))
        plan.counts["settlements"] += 1
        plan.ops.append(lambda i=sid, u=update: _write("move settlement", lambda: (
            supabase.table(Tables.SETTLEMENTS).update(u).eq("id", i).execute()
        )))

    if dropped:
        ids = sorted(dropped)
        # Dropped first, so the shares are free before the settlement goes (the database would do the
        # same, this just does not depend on it).
        plan.ops.insert(0, lambda: _write("drop settlements between the two", lambda: (
            supabase.table(Tables.EXPENSE_SHARES).update({"settlement_id": None}).in_("settlement_id", ids).execute(),
            supabase.table(Tables.SETTLEMENTS).delete().in_("id", ids).execute(),
        )))
    return dropped


def _raise_settlement_clash(ctx: _Ctx, other_id: str) -> None:
    names = {p["id"]: p["name"] for p in _select(Tables.PROFILES, "id, name")}
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=(
            f"{ctx.plan.source['name']} en {ctx.new} hebben allebei een lopende afrekening met "
            f"{names.get(other_id, 'dezelfde persoon')}. Rond een van die twee eerst af onder Afrekenen "
            "en voeg daarna samen."
        ),
    )


def _plan_money(ctx: _Ctx, dropped_settlements: set[str]) -> None:
    """Expenses paid, and who shares in them. The member must not owe themselves: a share that ends up
    owed by the payer to the payer is settled. Two shares of the member in one expense become one when
    they are in the same state; otherwise both stay, because adding them up would lose which is paid."""
    plan, old, new = ctx.plan, ctx.old, ctx.new
    expenses = _select(Tables.EXPENSES, "id, paid_by")
    shares = _select(Tables.EXPENSE_SHARES, "id, expense_id, participant, amount, status, settlement_id")
    paid = [e for e in expenses if e["paid_by"] in old]
    payer_of = {e["id"]: e["paid_by"] for e in expenses}
    by_expense: dict[str, list[dict]] = defaultdict(list)
    for share in shares:
        by_expense[share["expense_id"]].append(share)

    affected = {s["expense_id"] for s in shares if s["participant"] in old} | {e["id"] for e in paid}
    now = datetime.now(timezone.utc).isoformat()
    changed_shares = 0

    for expense_id in sorted(affected):
        payer = payer_of.get(expense_id)
        payer = new if payer in old else payer
        members: list[dict] = []  # the member's shares of this expense after the merge
        for share in by_expense.get(expense_id, []):
            participant = new if share["participant"] in old else share["participant"]
            status_, settlement = share["status"], share.get("settlement_id")
            update: dict[str, Any] = {}
            if participant != share["participant"]:
                update["participant"] = participant
            if settlement in dropped_settlements:
                settlement = None
                update["settlement_id"] = None
            if participant == payer and status_ != "confirmed":
                status_ = "confirmed"
                update["status"], update["confirmed_at"] = "confirmed", now
            record = {"id": share["id"], "amount": share["amount"], "status": status_, "settlement": settlement, "update": update}
            if participant == new:
                members.append(record)
            elif update:
                changed_shares += 1
                plan.ops.append(lambda i=share["id"], u=update: _write("update expense share", lambda: (
                    supabase.table(Tables.EXPENSE_SHARES).update(u).eq("id", i).execute()
                )))

        one_state = len({(m["status"], m["settlement"]) for m in members}) == 1
        if len(members) > 1 and one_state:
            keep, rest = members[0], members[1:]
            total = sum((Decimal(str(m["amount"])) for m in members), Decimal(0))
            keep["update"]["amount"] = float(total)
            changed_shares += len(rest) + 1
            plan.ops.append(lambda i=keep["id"], u=keep["update"], gone=[m["id"] for m in rest]: _write("merge expense shares", lambda: (
                supabase.table(Tables.EXPENSE_SHARES).update(u).eq("id", i).execute(),
                supabase.table(Tables.EXPENSE_SHARES).delete().in_("id", gone).execute(),
            )))
        else:
            for m in members:
                if m["update"]:
                    changed_shares += 1
                    plan.ops.append(lambda i=m["id"], u=m["update"]: _write("update expense share", lambda: (
                        supabase.table(Tables.EXPENSE_SHARES).update(u).eq("id", i).execute()
                    )))

    plan.counts["expense_shares"] = changed_shares
    if paid:
        plan.counts["expenses"] = len(paid)
        plan.ops.append(lambda: _write("rename expenses.paid_by", lambda: (
            supabase.table(Tables.EXPENSES).update({"paid_by": new}).in_("paid_by", ctx.old_list).execute()
        )))


def _plan_profile(ctx: _Ctx) -> None:
    """The member keeps their own profile; they only gain the placeholder's badges, and the placeholder's
    names as aliases (added after the placeholder is gone)."""
    plan, source, target = ctx.plan, ctx.plan.source, ctx.plan.target
    have = set(target.get("badge_ids") or [])
    plan.badge_ids = [b for b in dict.fromkeys(source.get("badge_ids") or []) if b not in have]
    plan.counts["badges"] = len(plan.badge_ids)
    if plan.badge_ids:
        add = plan.badge_ids
        plan.ops.append(lambda: update_list(
            Tables.PROFILES, ctx.target_id, "badge_ids",
            lambda current, _row: [*current, *[b for b in add if b not in current]] or None,
        ))

    taken = {n.casefold() for n in [target["name"], *(target.get("aliases") or [])] if n}
    plan.alias_names = [n for n in ctx.plan.names if n.casefold() not in taken]


# ── The two entry points ──────────────────────────────────────────────────────

def plan_merge(source: dict, target: dict) -> MergePlan:
    """Everything a merge would do, without doing any of it. Raises 409 when it cannot be done."""
    names = [n for n in dict.fromkeys([source["name"], *(source.get("aliases") or [])]) if n and n != target["name"]]
    plan = MergePlan(source=source, target=target, names=names)
    ctx = _Ctx(
        plan=plan, old=set(names), new=target["name"], source_id=source["id"], target_id=target["id"],
        same={target["name"], *(target.get("aliases") or [])},
    )
    dropped = _plan_settlements(ctx)
    _plan_money(ctx, dropped)
    _plan_lists(ctx)
    _plan_renames(ctx)
    _plan_per_trip(ctx)
    _plan_ticket_votes(ctx)
    _plan_profile(ctx)
    return plan


def execute(plan: MergePlan) -> None:
    """Runs a plan: every move, then the placeholder is deleted, then its name becomes the member's alias."""
    for op in plan.ops:
        op()

    _write("delete the placeholder profile", lambda: (
        supabase.table(Tables.PROFILES).delete().eq("id", plan.source["id"]).execute()
    ))

    if plan.alias_names:
        names = plan.alias_names

        def add_aliases(current: list, _row: dict) -> list | None:
            have = {n.casefold() for n in current}
            extra = [n for n in names if n.casefold() not in have]
            return [*current, *extra] if extra else None

        try:
            update_list(Tables.PROFILES, plan.target["id"], "aliases", add_aliases)
        except HTTPException:
            # Everything else is done and the placeholder is gone, so a retry is not possible: say what is left.
            logger.error("Merge: %s was merged into %s but their names could not be added as aliases", names, plan.target["name"])
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    f"Het samenvoegen is gelukt, maar de naam {', '.join(names)} kon niet als bijnaam bij "
                    f"{plan.target['name']} worden gezet. Voeg die zelf toe onder Gebruikers."
                ),
            )
