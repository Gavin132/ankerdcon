from fastapi import APIRouter, Depends, HTTPException, status

from app.constants import Tables
from app.dependencies import get_current_user
from app.models.calendar import CalendarEvent, CalendarRsvpRequest
from app.core.database import supabase

router = APIRouter(prefix="/calendar", tags=["calendar"])


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
