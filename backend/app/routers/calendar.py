from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_current_user
from app.models.calendar import CalendarEvent, CalendarRsvpRequest
from app.core.database import supabase

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/", response_model=list[CalendarEvent])
def list_events(_: str = Depends(get_current_user)) -> list[CalendarEvent]:
    """Fetch all calendar events."""
    response = supabase.table("calendar").select("*").order("id").execute()
    return response.data


@router.post("/{event_id}/rsvp", status_code=status.HTTP_204_NO_CONTENT)
def rsvp_event(
    event_id: int, # This acts as the specific row ID (what used to be rowNumber)
    body: CalendarRsvpRequest,
    _: str = Depends(get_current_user),
) -> None:
    """Add a user to the participants array for the entire event group."""
    
    # 1. Fetch the specific row to check its participants and group ID
    resp = supabase.table("calendar").select("participants, event_group_id").eq("id", event_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
    row = resp.data[0]
    participants = row.get("participants") or []
    group_id = row.get("event_group_id")
    
    # 2. Append if not already in the list
    if body.user_name not in participants:
        participants.append(body.user_name)
        
        # 3. If it's a multi-day event, update ALL rows in the group. Otherwise, just update this row.
        if group_id is not None:
            supabase.table("calendar").update({"participants": participants}).eq("event_group_id", group_id).execute()
        else:
            supabase.table("calendar").update({"participants": participants}).eq("id", event_id).execute()


@router.post("/{event_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_event(
    event_id: int,
    body: CalendarRsvpRequest,
    _: str = Depends(get_current_user),
) -> None:
    """Remove a user from the participants array for the entire event group."""
    
    resp = supabase.table("calendar").select("participants, event_group_id").eq("id", event_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
    row = resp.data[0]
    participants = row.get("participants") or []
    group_id = row.get("event_group_id")
    
    # Remove if they are in the list
    if body.user_name in participants:
        participants.remove(body.user_name)
        
        # Apply the removal to the whole group or just the single row
        if group_id is not None:
            supabase.table("calendar").update({"participants": participants}).eq("event_group_id", group_id).execute()
        else:
            supabase.table("calendar").update({"participants": participants}).eq("id", event_id).execute()