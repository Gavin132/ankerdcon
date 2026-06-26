from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse

from app.constants import Tables
from app.dependencies import get_current_user
from app.models.calendar import CalendarEvent, CalendarRsvpRequest
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
