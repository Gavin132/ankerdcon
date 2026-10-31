"""
Ticket vote ("Kaartverkoop"): which ticket does everybody want, and who bought them.

An admin opens a vote on a trip with the ticket options, members pick one (or "niet" / "weet ik nog niet"),
and an admin closes it by saying who bought the tickets, one buyer for the whole group. Nothing about money
is kept here: the buyer adds an expense in Financiën like for anything else.

A trip's id is its event's id when it has several days, else its one day's id; both are accepted and
resolved to the event, which the vote belongs to (one per trip).
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app import messages as M
from app.config import Settings, get_settings
from app.constants import Tables
from app.core.database import supabase
from app.core.logging import get_logger
from app.dependencies import _profile_exists, act_for_anyone, get_admin_user, get_current_user
from app.models.ticket_poll import (
    CastVoteRequest,
    OpenTicketPollRequest,
    TicketPoll,
    TicketsBoughtRequest,
    TicketVote,
)
from app.routes import TicketPollRoutes
from app.services import notification_service
from app.services.discord_bot import escape_markdown
from app.services.notification_service import NotificationCategory

logger = get_logger(__name__)
router = APIRouter(prefix=TicketPollRoutes.PREFIX, tags=["ticket-polls"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."
_NO_EVENT = "Evenement niet gevonden."
_NO_POLL = "Er is geen ticket poll voor dit evenement."
_CLOSED = "De tickets zijn al gekocht. Je kunt niet meer stemmen."
_BAD_CHOICE = "Dat ticket staat niet in de poll. Kies een ticket uit de lijst."
# Besides the ticket options, a member can say they do not know yet. Somebody who is not going just does not vote.
_UNSURE = "unsure"


def _db_error(what: str, e: Exception) -> HTTPException:
    logger.error("Ticket vote: %s: %s", what, e)
    return HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


def _event_id(trip_id: str) -> str:
    """The event a trip id belongs to: the id itself when it is an event, else the event of that day."""
    try:
        if supabase.table(Tables.EVENTS).select("id").eq("id", trip_id).execute().data:
            return trip_id
        day = supabase.table(Tables.EVENT_DAYS).select("event_id").eq("id", trip_id).execute().data
    except Exception as e:
        raise _db_error(f"resolve trip {trip_id}", e)
    if not day:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NO_EVENT)
    return day[0]["event_id"]


def _poll_row(event_id: str) -> Optional[dict[str, Any]]:
    try:
        rows = supabase.table(Tables.TICKET_POLLS).select("*").eq("event_id", event_id).execute().data
    except Exception as e:
        raise _db_error(f"read the poll of {event_id}", e)
    return rows[0] if rows else None


def _view(poll: dict[str, Any]) -> TicketPoll:
    try:
        votes = supabase.table(Tables.TICKET_VOTES).select("voter, choice").eq("poll_id", poll["id"]).execute().data or []
    except Exception as e:
        raise _db_error(f"read the votes of {poll['id']}", e)
    return TicketPoll(
        id=poll["id"],
        event_id=poll["event_id"],
        status=poll["status"],
        options=poll.get("options") or [],
        votes=[TicketVote(**v) for v in votes],
        buyer=poll.get("buyer"),
        chosen_option=poll.get("chosen_option"),
    )


def _open_poll(trip_id: str) -> dict[str, Any]:
    poll = _poll_row(_event_id(trip_id))
    if not poll:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NO_POLL)
    return poll


def _tell_the_trip(background_tasks: BackgroundTasks, settings: Settings, event_id: str, content: str) -> None:
    """A DM or push to the people who asked for ticket votes, about this trip. Never fails the request."""
    try:
        days = supabase.table(Tables.EVENT_DAYS).select("id").eq("event_id", event_id).limit(1).execute().data
        trip_names = notification_service.trip_names_for_day(days[0]["id"] if days else None)
    except Exception as e:
        logger.warning("Ticket vote: could not work out who goes on %s: %s", event_id, e)
        trip_names = None
    background_tasks.add_task(
        notification_service.broadcast_category_dm,
        settings.discord_bot_token,
        NotificationCategory.TICKET_VOTE,
        content,
        trip_names=trip_names,
    )


def _event_name(event_id: str) -> str:
    try:
        rows = supabase.table(Tables.EVENTS).select("title").eq("id", event_id).execute().data
        return escape_markdown((rows[0].get("title") if rows else "") or "het evenement")
    except Exception:
        return "het evenement"


@router.get(TicketPollRoutes.TRIP, response_model=Optional[TicketPoll])
def get_ticket_poll(trip_id: str, current_user: str = Depends(get_current_user)) -> Optional[TicketPoll]:
    poll = _poll_row(_event_id(trip_id))
    return _view(poll) if poll else None


@router.put(TicketPollRoutes.TRIP, response_model=TicketPoll, status_code=status.HTTP_201_CREATED)
def open_ticket_poll(
    trip_id: str,
    body: OpenTicketPollRequest,
    background_tasks: BackgroundTasks,
    settings: Settings = Depends(get_settings),
    admin: str = Depends(get_admin_user),
) -> TicketPoll:
    event_id = _event_id(trip_id)
    if _poll_row(event_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Er is al een ticket poll voor dit evenement. Verwijder die eerst om opnieuw te beginnen.",
        )
    options = [{"id": f"o{i + 1}", "label": o.label.strip(), "price": round(o.price, 2)} for i, o in enumerate(body.options)]
    if any(not o["label"] for o in options):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Elk ticket heeft een naam nodig.")
    try:
        row = supabase.table(Tables.TICKET_POLLS).insert({"event_id": event_id, "options": options}).execute().data[0]
    except Exception as e:
        raise _db_error(f"open a poll on {event_id}", e)
    _tell_the_trip(
        background_tasks, settings, event_id,
        M.DM_TICKET_VOTE_OPENED.format(
            event_name=_event_name(event_id),
            options=", ".join(escape_markdown(o["label"]) for o in options),
        ),
    )
    return _view(row)


@router.put(TicketPollRoutes.VOTE, status_code=status.HTTP_204_NO_CONTENT)
def cast_ticket_vote(trip_id: str, body: CastVoteRequest, current_user: str = Depends(get_current_user)) -> None:
    poll = _open_poll(trip_id)
    if poll["status"] != "open":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=_CLOSED)
    # Members ask around and fill the vote in for each other, so any member's name is accepted.
    voter = act_for_anyone(current_user, body.user_name, adding=True)
    if body.choice not in {o["id"] for o in poll.get("options") or []} | {_UNSURE}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_BAD_CHOICE)
    try:
        supabase.table(Tables.TICKET_VOTES).upsert(
            {"poll_id": poll["id"], "voter": voter, "choice": body.choice, "updated_at": "now()"},
            on_conflict="poll_id,voter",
        ).execute()
    except Exception as e:
        raise _db_error(f"save the vote of {voter}", e)


@router.delete(TicketPollRoutes.VOTE, status_code=status.HTTP_204_NO_CONTENT)
def withdraw_ticket_vote(
    trip_id: str,
    user_name: Optional[str] = None,
    current_user: str = Depends(get_current_user),
) -> None:
    """Take a vote back, your own or (like casting one) somebody else's. Withdrawing none is not an error."""
    poll = _open_poll(trip_id)
    if poll["status"] != "open":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=_CLOSED)
    voter = act_for_anyone(current_user, user_name)
    try:
        supabase.table(Tables.TICKET_VOTES).delete().eq("poll_id", poll["id"]).eq("voter", voter).execute()
    except Exception as e:
        raise _db_error(f"withdraw the vote of {voter}", e)


@router.post(TicketPollRoutes.BOUGHT, response_model=TicketPoll)
def tickets_bought(
    trip_id: str,
    body: TicketsBoughtRequest,
    background_tasks: BackgroundTasks,
    settings: Settings = Depends(get_settings),
    admin: str = Depends(get_admin_user),
) -> TicketPoll:
    poll = _open_poll(trip_id)
    if poll["status"] != "open":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=_CLOSED)
    option = next((o for o in poll.get("options") or [] if o["id"] == body.option_id), None)
    if option is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_BAD_CHOICE)
    if not _profile_exists(body.buyer):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Onbekend lid. Kies de koper uit de lijst.")
    try:
        row = (
            supabase.table(Tables.TICKET_POLLS)
            .update({"status": "bought", "buyer": body.buyer, "chosen_option": option["id"], "bought_at": "now()"})
            .eq("id", poll["id"])
            .execute()
            .data[0]
        )
    except Exception as e:
        raise _db_error(f"mark the tickets of {poll['id']} as bought", e)
    _tell_the_trip(
        background_tasks, settings, poll["event_id"],
        M.DM_TICKET_VOTE_BOUGHT.format(
            event_name=_event_name(poll["event_id"]),
            buyer=escape_markdown(body.buyer),
            option=escape_markdown(option["label"]),
        ),
    )
    return _view(row)


@router.delete(TicketPollRoutes.TRIP, status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket_poll(trip_id: str, admin: str = Depends(get_admin_user)) -> None:
    poll = _poll_row(_event_id(trip_id))
    if not poll:
        return
    try:
        supabase.table(Tables.TICKET_POLLS).delete().eq("id", poll["id"]).execute()
    except Exception as e:
        raise _db_error(f"delete the poll {poll['id']}", e)
