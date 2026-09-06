from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse

from app.constants import Tables
from app.core.logging import get_logger
from app.dependencies import get_current_user
from app.models.calendar import (
    BulkCreateHotelRoomsRequest,
    CalendarEvent,
    CalendarRsvpRequest,
    CreateHotelRoomRequest,
    HotelRoom,
    HotelRoomAssignRequest,
    HotelRoomLeaveRequest,
)
from app.routes import CalendarRoutes
from app.core.database import supabase

logger = get_logger(__name__)
router = APIRouter(prefix=CalendarRoutes.PREFIX, tags=["calendar"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."


def _parse_event_date(date_str: str) -> datetime | None:
    for fmt in ("%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def _ics_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def _load_calendar_rows() -> list[dict]:
    """Adapter: builds CalendarEvent-shaped rows from `events` + `event_days`
    so every existing consumer (frontend, ICS feed, reminders, link previews)
    keeps working against the same shape while the real data lives in the
    new parent/child tables.

    `id` is the event_days id — this preserves today's per-day id semantics,
    since meals/rides/cosplays/hotel-rooms and RSVP all key off of it.
    `multi_day_id` is set to the parent event's id only when that event has
    more than one day (left unset for a genuinely single-day event), so
    DayStrip / multi-day navigation on the frontend triggers exactly like it
    did against the old calendar table.
    """
    events = {e["id"]: e for e in supabase.table(Tables.EVENTS).select("*").execute().data}
    days = supabase.table(Tables.EVENT_DAYS).select("*").order("date").execute().data

    days_per_event: dict[str, int] = {}
    for d in days:
        days_per_event[d["event_id"]] = days_per_event.get(d["event_id"], 0) + 1

    rows = []
    for day in days:
        event = events.get(day["event_id"])
        if not event:
            continue  # orphaned day row — shouldn't happen, skip defensively
        rows.append({
            "id": day["id"],
            "event_group_id": event.get("event_group_id"),
            "multi_day_id": event["id"] if days_per_event[event["id"]] > 1 else None,
            "event_name": event["event_name"],
            "date": day["date"],
            "has_con": day.get("has_con", True),
            "is_hotel": event.get("is_hotel", False),
            "hotel_location": event.get("hotel_location"),
            "participants": day.get("participants") or [],
            "image_url": event.get("image_url"),
            "description": event.get("description"),
            "location": event.get("location"),
            "website": event.get("website"),
            "ticket_url": event.get("ticket_url"),
            "ticket_sale_start": event.get("ticket_sale_start"),
            "ticket_types": event.get("ticket_types"),
            "locker_info": event.get("locker_info"),
            "parking_info": event.get("parking_info"),
            "special_instructions": event.get("special_instructions"),
            "what_to_bring": event.get("what_to_bring"),
        })
    return rows


@router.get(CalendarRoutes.FEED, response_class=PlainTextResponse, include_in_schema=False)
def calendar_feed() -> PlainTextResponse:
    """Public ICS subscription feed — no auth required, compatible with Google Calendar."""
    try:
        events = _load_calendar_rows()
    except Exception as e:
        logger.error("Failed to fetch calendar for ICS feed: %s", e)
        return PlainTextResponse("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR", media_type="text/calendar; charset=utf-8")

    dtstamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Ankerd Con//Calendar Feed//NL",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Ankerd Con",
        "X-WR-CALDESC:Ankerd Con evenementen",
        "X-WR-TIMEZONE:Europe/Amsterdam",
    ]

    for ev in events:
        date = _parse_event_date(ev.get("date") or "")
        if not date:
            continue
        dtstart = date.strftime("%Y%m%d")
        dtend = (date + timedelta(days=1)).strftime("%Y%m%d")
        lines += [
            "BEGIN:VEVENT",
            f"UID:{ev['id']}@ankerdcon",
            f"DTSTART;VALUE=DATE:{dtstart}",
            f"DTEND;VALUE=DATE:{dtend}",
            f"DTSTAMP:{dtstamp}",
            f"SUMMARY:{_ics_escape(ev.get('event_name') or 'Evenement')}",
        ]
        if ev.get("location"):
            lines.append(f"LOCATION:{_ics_escape(ev['location'])}")
        if ev.get("description"):
            lines.append(f"DESCRIPTION:{_ics_escape(ev['description'])}")
        if ev.get("website"):
            lines.append(f"URL:{ev['website']}")
        lines.append("END:VEVENT")

    lines.append("END:VCALENDAR")

    return PlainTextResponse(
        "\r\n".join(lines),
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": "inline; filename=ankerd-con.ics"},
    )


@router.get(CalendarRoutes.LIST, response_model=list[CalendarEvent])
def list_events(_: str = Depends(get_current_user)) -> list[CalendarEvent]:
    try:
        return _load_calendar_rows()
    except Exception as e:
        logger.error("Failed to list calendar events: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(CalendarRoutes.RSVP, status_code=status.HTTP_204_NO_CONTENT)
def rsvp_event(event_id: str, body: CalendarRsvpRequest, _: str = Depends(get_current_user)) -> None:
    """Add a user to the participants array for this specific day only.
    `event_id` is an event_days id (see _load_calendar_rows)."""
    try:
        resp = supabase.table(Tables.EVENT_DAYS).select("participants").eq("id", event_id).execute()
    except Exception as e:
        logger.error("Failed to fetch event day %s for RSVP: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evenement niet gevonden.")

    participants = resp.data[0].get("participants") or []
    if body.user_name not in participants:
        participants.append(body.user_name)
        try:
            supabase.table(Tables.EVENT_DAYS).update({"participants": participants}).eq("id", event_id).execute()
        except Exception as e:
            logger.error("Failed to update participants for event day %s: %s", event_id, e)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(CalendarRoutes.LEAVE, status_code=status.HTTP_204_NO_CONTENT)
def leave_event(event_id: str, body: CalendarRsvpRequest, _: str = Depends(get_current_user)) -> None:
    """Remove a user from the participants array for this specific day only."""
    try:
        resp = supabase.table(Tables.EVENT_DAYS).select("participants").eq("id", event_id).execute()
    except Exception as e:
        logger.error("Failed to fetch event day %s for leave: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evenement niet gevonden.")

    participants = resp.data[0].get("participants") or []
    if body.user_name in participants:
        participants.remove(body.user_name)
        try:
            supabase.table(Tables.EVENT_DAYS).update({"participants": participants}).eq("id", event_id).execute()
        except Exception as e:
            logger.error("Failed to update participants for event day %s: %s", event_id, e)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


# ── Hotel Rooms ────────────────────────────────────────────────────────────────

def _hotel_group_key(event_id: str) -> tuple[str, bool]:
    """Resolve an event_days id to its parent event — now always the real,
    single source of truth for hotel rooms (every day already points at
    exactly one real parent, no more multi_day_id-or-self fallback needed)."""
    try:
        day_resp = supabase.table(Tables.EVENT_DAYS).select("event_id").eq("id", event_id).execute()
    except Exception as e:
        logger.error("Failed to fetch event day %s for hotel group key: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not day_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evenement niet gevonden.")

    parent_id = day_resp.data[0]["event_id"]
    try:
        event_resp = supabase.table(Tables.EVENTS).select("is_hotel").eq("id", parent_id).execute()
    except Exception as e:
        logger.error("Failed to fetch event %s for hotel group key: %s", parent_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not event_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evenement niet gevonden.")

    return parent_id, event_resp.data[0].get("is_hotel", False)


@router.get(CalendarRoutes.HOTEL_ROOMS, response_model=list[HotelRoom])
def list_hotel_rooms(event_id: str, _: str = Depends(get_current_user)) -> list[HotelRoom]:
    group_key, _ = _hotel_group_key(event_id)
    try:
        return supabase.table(Tables.HOTEL_ROOMS).select("*").eq("event_id", group_key).order("room_number").execute().data
    except Exception as e:
        logger.error("Failed to list hotel rooms for event %s: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(CalendarRoutes.HOTEL_ROOMS, response_model=HotelRoom, status_code=status.HTTP_201_CREATED)
def create_hotel_room(
    event_id: str,
    body: CreateHotelRoomRequest,
    _: str = Depends(get_current_user),
) -> HotelRoom:
    group_key, is_hotel = _hotel_group_key(event_id)
    if not is_hotel:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dit evenement heeft geen hotel.")
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    data["event_id"] = group_key
    data.setdefault("occupants", [])
    try:
        resp = supabase.table(Tables.HOTEL_ROOMS).insert(data).execute()
        return resp.data[0]
    except Exception as e:
        logger.error("Failed to create hotel room for event %s: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(CalendarRoutes.HOTEL_ROOMS_BULK, response_model=list[HotelRoom], status_code=status.HTTP_201_CREATED)
def bulk_create_hotel_rooms(
    event_id: str,
    body: BulkCreateHotelRoomsRequest,
    _: str = Depends(get_current_user),
) -> list[HotelRoom]:
    """Generate a batch of blank rooms at once (e.g. "10 rooms of 2, 2 rooms of
    3") instead of adding each one by hand — room numbers are left empty since
    hotels usually only hand those out at check-in."""
    group_key, is_hotel = _hotel_group_key(event_id)
    if not is_hotel:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dit evenement heeft geen hotel.")

    rows = [
        {"event_id": group_key, "capacity": batch.capacity, "occupants": []}
        for batch in body.batches
        for _i in range(batch.count)
    ]
    try:
        resp = supabase.table(Tables.HOTEL_ROOMS).insert(rows).execute()
        return resp.data
    except Exception as e:
        logger.error("Failed to bulk-create hotel rooms for event %s: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(CalendarRoutes.HOTEL_ROOM_ASSIGN, status_code=status.HTTP_204_NO_CONTENT)
def assign_hotel_room(
    event_id: str,
    room_id: str,
    body: HotelRoomAssignRequest,
    _: str = Depends(get_current_user),
) -> None:
    try:
        resp = supabase.table(Tables.HOTEL_ROOMS).select("occupants, capacity").eq("id", room_id).execute()
    except Exception as e:
        logger.error("Failed to fetch hotel room %s: %s", room_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kamer niet gevonden.")

    room = resp.data[0]
    current = room.get("occupants") or []
    merged = list(dict.fromkeys(current + body.user_names))

    capacity = room.get("capacity")
    if capacity is not None and len(merged) > capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Deze kamer zit vol (max {capacity} personen).",
        )

    try:
        supabase.table(Tables.HOTEL_ROOMS).update({"occupants": merged}).eq("id", room_id).execute()
    except Exception as e:
        logger.error("Failed to assign occupants to hotel room %s: %s", room_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(CalendarRoutes.HOTEL_ROOM_LEAVE, status_code=status.HTTP_204_NO_CONTENT)
def leave_hotel_room(
    event_id: str,
    room_id: str,
    body: HotelRoomLeaveRequest,
    _: str = Depends(get_current_user),
) -> None:
    try:
        resp = supabase.table(Tables.HOTEL_ROOMS).select("occupants").eq("id", room_id).execute()
    except Exception as e:
        logger.error("Failed to fetch hotel room %s: %s", room_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kamer niet gevonden.")

    occupants = [o for o in (resp.data[0].get("occupants") or []) if o != body.user_name]
    try:
        supabase.table(Tables.HOTEL_ROOMS).update({"occupants": occupants}).eq("id", room_id).execute()
    except Exception as e:
        logger.error("Failed to update occupants for hotel room %s: %s", room_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
