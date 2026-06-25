from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status

from app.config import Settings, get_settings
from app.dependencies import get_current_user
from app.models.user import LocationPingRequest, UpdateNameRequest, UpdatePreferencesRequest, User
from app.core.database import supabase
import app.services.discord_service as discord_service
import uuid

BANNER_BUCKET = "banners"
BANNER_MAX_BYTES = 8 * 1024 * 1024  # 8 MB
BANNER_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
BANNER_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp"}

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
    if body.phone_number is not None: updates["phone_number"] = body.phone_number

    if not updates:
        return

    # Update the row where the name matches the currently logged-in user
    response = supabase.table("profiles").update(updates).eq("name", current_user).execute()
    
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")


@router.patch("/name", status_code=status.HTTP_204_NO_CONTENT)
def update_name(
    body: UpdateNameRequest,
    current_user: str = Depends(get_current_user),
) -> None:
    """Let a user rename themselves. Validates uniqueness and format.

    WARNING: This only updates the profiles table. Historical data in other tables
    (ride passengers, meal participants, payment paid_by, etc.) still uses the old name
    and will not be updated automatically.
    """
    new_name = body.new_name  # already stripped by the validator

    if new_name == current_user:
        return

    # Check uniqueness
    existing = supabase.table("profiles").select("name").eq("name", new_name).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Deze naam is al in gebruik door een ander account.",
        )

    response = supabase.table("profiles").update({"name": new_name}).eq("name", current_user).execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden")


@router.put("/{identifier}/location", status_code=status.HTTP_204_NO_CONTENT)
def ping_location(
    identifier: str,
    body: LocationPingRequest,
    current_user: str = Depends(get_current_user),
) -> None:
    """Update the live location ping for a user."""
    now = datetime.now().strftime("%H:%M")
    base = f"{body.zone}|{body.text}" if body.text else body.zone
    value = f"{base} (at {now})"
    response = supabase.table("profiles").update({"live_location_ping": value}).eq("name", identifier).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")


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


@router.post("/banner", response_model=dict)
async def upload_banner(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user),
) -> dict:
    """Upload a banner image/GIF for the current user to Supabase Storage."""
    if file.content_type not in BANNER_ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Bestandstype niet toegestaan. Gebruik JPG, PNG, GIF of WebP.",
        )

    content = await file.read()
    if len(content) > BANNER_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Bestand te groot. Maximum is 8 MB.",
        )

    # Resolve user UUID
    user_row = supabase.table("profiles").select("id, banner_url").eq("name", current_user).execute()
    if not user_row.data:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")
    user_id = user_row.data[0]["id"]
    old_url: str | None = user_row.data[0].get("banner_url")

    # Remove previous banner from storage (ignore errors)
    if old_url:
        try:
            old_path = old_url.split(f"/public/{BANNER_BUCKET}/")[-1].split("?")[0]
            supabase.storage.from_(BANNER_BUCKET).remove([old_path])
        except Exception:
            pass

    ext = BANNER_EXT.get(file.content_type, "jpg")
    path = f"{user_id}/banner.{ext}"

    supabase.storage.from_(BANNER_BUCKET).upload(
        path,
        content,
        {"upsert": "true", "content-type": file.content_type},
    )

    public_url = supabase.storage.from_(BANNER_BUCKET).get_public_url(path)
    # Bust CDN cache with a version query param
    versioned_url = f"{public_url}?v={uuid.uuid4().hex[:8]}"

    supabase.table("profiles").update({"banner_url": versioned_url}).eq("name", current_user).execute()

    return {"url": versioned_url}


@router.delete("/banner", status_code=status.HTTP_204_NO_CONTENT)
def delete_banner(current_user: str = Depends(get_current_user)) -> None:
    """Remove the current user's banner image."""
    user_row = supabase.table("profiles").select("id, banner_url").eq("name", current_user).execute()
    if not user_row.data:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")

    old_url: str | None = user_row.data[0].get("banner_url")
    if old_url:
        try:
            old_path = old_url.split(f"/public/{BANNER_BUCKET}/")[-1].split("?")[0]
            supabase.storage.from_(BANNER_BUCKET).remove([old_path])
        except Exception:
            pass

    supabase.table("profiles").update({"banner_url": None}).eq("name", current_user).execute()