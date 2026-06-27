from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse

from app.constants import Tables
from app.dependencies import get_current_user
from app.models.calendar import (
    CalendarEvent,
    CalendarRsvpRequest,
    HotelRoom,
    CreateHotelRoomRequest,
    HotelRoomAssignRequest,
    HotelRoomLeaveRequest,
)
from app.core.database import supabase

router = APIRouter(prefix="/calendar", tags=["calendar"])


def _parse_event_date(date_str: str) -> datetime | None:
    for fmt in ("%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def _ics_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


@router.get("/feed.ics", response_class=PlainTextResponse, include_in_schema=False)
def calendar_feed() -> PlainTextResponse:
    """Public ICS subscription feed — no auth required, compatible with Google Calendar."""
    events = supabase.table(Tables.CALENDAR).select("*").execute().data
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


@router.get("/", response_model=list[CalendarEvent])
def list_events(_: str = Depends(get_current_user)) -> list[CalendarEvent]:
    return supabase.table(Tables.CALENDAR).select("*").order("id").execute().data


@router.post("/{event_id}/rsvp", status_code=status.HTTP_204_NO_CONTENT)
def rsvp_event(event_id: str, body: CalendarRsvpRequest, _: str = Depends(get_current_user)) -> None:
    """Add a user to the participants array for the entire event group."""
    resp = supabase.table(Tables.CALENDAR).select("participants, event_group_id").eq("id", event_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evenement niet gevonden.")

    row = resp.data[0]
    participants = row.get("participants") or []
    group_id = row.get("event_group_id")

    if body.user_name not in participants:
        participants.append(body.user_name)
        if group_id is not None:
            supabase.table(Tables.CALENDAR).update({"participants": participants}).eq("event_group_id", group_id).execute()
        else:
            supabase.table(Tables.CALENDAR).update({"participants": participants}).eq("id", event_id).execute()


@router.post("/{event_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_event(event_id: str, body: CalendarRsvpRequest, _: str = Depends(get_current_user)) -> None:
    """Remove a user from the participants array for the entire event group."""
    resp = supabase.table(Tables.CALENDAR).select("participants, event_group_id").eq("id", event_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evenement niet gevonden.")

    row = resp.data[0]
    participants = row.get("participants") or []
    group_id = row.get("event_group_id")

    if body.user_name in participants:
        participants.remove(body.user_name)
        if group_id is not None:
            supabase.table(Tables.CALENDAR).update({"participants": participants}).eq("event_group_id", group_id).execute()
        else:
            supabase.table(Tables.CALENDAR).update({"participants": participants}).eq("id", event_id).execute()


# ── Hotel Rooms ────────────────────────────────────────────────────────────────

def _hotel_group_key(event_id: str) -> str:
    """Return the multi_day_id if this event belongs to a multi-day group,
    otherwise return the event_id itself.  This ensures all days in a group
    share exactly the same set of hotel rooms."""
    resp = supabase.table(Tables.CALENDAR).select("multi_day_id, is_hotel").eq("id", event_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evenement niet gevonden.")
    row = resp.data[0]
    return row["multi_day_id"] or event_id, row.get("is_hotel", False)


@router.get("/{event_id}/hotel-rooms", response_model=list[HotelRoom])
def list_hotel_rooms(event_id: str, _: str = Depends(get_current_user)) -> list[HotelRoom]:
    group_key, _ = _hotel_group_key(event_id)
    return supabase.table(Tables.HOTEL_ROOMS).select("*").eq("event_id", group_key).order("room_number").execute().data


@router.post("/{event_id}/hotel-rooms", response_model=HotelRoom, status_code=status.HTTP_201_CREATED)
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
    resp = supabase.table(Tables.HOTEL_ROOMS).insert(data).execute()
    return resp.data[0]


@router.post("/{event_id}/hotel-rooms/{room_id}/assign", status_code=status.HTTP_204_NO_CONTENT)
def assign_hotel_room(
    event_id: str,
    room_id: str,
    body: HotelRoomAssignRequest,
    _: str = Depends(get_current_user),
) -> None:
    # Look up by room id only — event_id already resolved to group_key at creation time
    resp = supabase.table(Tables.HOTEL_ROOMS).select("occupants").eq("id", room_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kamer niet gevonden.")
    current = resp.data[0].get("occupants") or []
    merged = list(dict.fromkeys(current + body.user_names))
    supabase.table(Tables.HOTEL_ROOMS).update({"occupants": merged}).eq("id", room_id).execute()


@router.post("/{event_id}/hotel-rooms/{room_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_hotel_room(
    event_id: str,
    room_id: str,
    body: HotelRoomLeaveRequest,
    _: str = Depends(get_current_user),
) -> None:
    resp = supabase.table(Tables.HOTEL_ROOMS).select("occupants").eq("id", room_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kamer niet gevonden.")
    occupants = [o for o in (resp.data[0].get("occupants") or []) if o != body.user_name]
    supabase.table(Tables.HOTEL_ROOMS).update({"occupants": occupants}).eq("id", room_id).execute()
