from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.dependencies import get_current_user
from app.models.user import LocationPingRequest, UpdatePreferencesRequest, User
from app.core.database import supabase
import app.services.discord_service as discord_service
import uuid

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/names", response_model=list[str])
def list_names() -> list[str]:
    """Public endpoint — returns only names for the login name picker."""
    # Pull just the name column from Supabase
    response = supabase.table("profiles").select("name").execute()
    return [row["name"] for row in response.data if row.get("name") and str(row.get("name")).strip()]


@router.get("/", response_model=list[User])
def list_all_users_safely(_: str = Depends(get_current_user)) -> list[User]:
    """Fetch all users for the Hub page, but scrub private data."""
    response = supabase.table("profiles").select("*").execute()
    
    safe_users = []
    for user in response.data:
        # Erase the sensitive data before it goes to the frontend!
        if "passcode" in user: 
            user["passcode"] = None 
            
        # Scrub the phone number so it doesn't leak to the public Hub
        user["phone_number"] = None 
        
        safe_users.append(user)
        
    return safe_users


@router.put("/preferences", status_code=status.HTTP_204_NO_CONTENT)
def update_preferences(
    body: UpdatePreferencesRequest,
    current_user: str = Depends(get_current_user),
) -> None:
    # Build a dictionary of only the values that were actually provided
    updates = {}
    if body.color is not None: updates["color"] = body.color
    if body.font is not None: updates["font"] = body.font
    if body.bio is not None: updates["bio"] = body.bio
    if body.banner_color is not None: updates["banner_color"] = body.banner_color
    if body.pronouns is not None: updates["pronouns"] = body.pronouns

    if not updates:
        return

    # Update the row where the name matches the currently logged-in user
    response = supabase.table("profiles").update(updates).eq("name", current_user).execute()
    
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")


@router.get("/{identifier}", response_model=User)
def get_user(identifier: str, _: str = Depends(get_current_user)) -> User:
    """Fetch a single user by either their secure UUID or their readable Name."""
    
    # 1. Check if the frontend is asking for a UUID or a Name
    try:
        uuid.UUID(identifier)
        is_uuid = True
    except ValueError:
        is_uuid = False

    # 2. Search the correct column in Supabase based on what we found
    if is_uuid:
        response = supabase.table("profiles").select("*").eq("id", identifier).execute()
    else:
        response = supabase.table("profiles").select("*").eq("name", identifier).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")
    
    user = response.data[0]
    
    # Scrub passcode if the column still exists
    if "passcode" in user:
        user["passcode"] = None
        
    return user