from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.constants import Tables
from app.dependencies import get_current_user
from app.models.user import LocationPingRequest, UpdateNameRequest, UpdatePreferencesRequest, User
from app.core.database import supabase

BANNER_BUCKET = "banners"
BANNER_MAX_BYTES = 8 * 1024 * 1024  # 8 MB
BANNER_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
BANNER_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp"}

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/names", response_model=list[str])
def list_names() -> list[str]:
    """Public endpoint — returns only names for the login name picker."""
    response = supabase.table(Tables.PROFILES).select("name").execute()
    return [row["name"] for row in response.data if row.get("name") and str(row.get("name")).strip()]


@router.get("/", response_model=list[User])
def list_all_users_safely(_: str = Depends(get_current_user)) -> list[User]:
    """Fetch all users — scrubs sensitive fields before returning."""
    response = supabase.table(Tables.PROFILES).select("*").execute()
    safe_users = []
    for user in response.data:
        user.pop("passcode", None)
        safe_users.append(user)
    return safe_users


@router.put("/preferences", status_code=status.HTTP_204_NO_CONTENT)
def update_preferences(
    body: UpdatePreferencesRequest,
    current_user: str = Depends(get_current_user),
) -> None:
    updates = {k: v for k, v in {
        "color":        body.color,
        "font":         body.font,
        "bio":          body.bio,
        "banner_color": body.banner_color,
        "pronouns":     body.pronouns,
        "phone_number": body.phone_number,
        "aliases":      body.aliases,
    }.items() if v is not None}

    if not updates:
        return

    response = supabase.table(Tables.PROFILES).update(updates).eq("name", current_user).execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")


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

    existing = supabase.table(Tables.PROFILES).select("name").eq("name", new_name).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Deze naam is al in gebruik door een ander account.",
        )

    # Fetch current aliases so we can append the old name
    profile_row = supabase.table(Tables.PROFILES).select("aliases").eq("name", current_user).execute()
    current_aliases: list[str] = (profile_row.data[0].get("aliases") or []) if profile_row.data else []
    if current_user not in current_aliases:
        current_aliases = current_aliases + [current_user]

    response = supabase.table(Tables.PROFILES).update({
        "name": new_name,
        "aliases": current_aliases,
    }).eq("name", current_user).execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")


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
    response = supabase.table(Tables.PROFILES).update({"live_location_ping": value}).eq("name", identifier).execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")


@router.get("/me", response_model=User)
def get_me(current_user: str = Depends(get_current_user)) -> User:
    """Return the full profile for the currently authenticated user."""
    response = supabase.table(Tables.PROFILES).select("*").eq("name", current_user).execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profiel niet gevonden.")
    user = response.data[0]
    user.pop("passcode", None)
    return user


@router.get("/{identifier}", response_model=User)
def get_user(identifier: str, _: str = Depends(get_current_user)) -> User:
    """Fetch a single user by either their secure UUID or their readable name."""
    try:
        uuid.UUID(identifier)
        is_uuid = True
    except ValueError:
        is_uuid = False

    if is_uuid:
        response = supabase.table(Tables.PROFILES).select("*").eq("id", identifier).execute()
    else:
        response = supabase.table(Tables.PROFILES).select("*").eq("name", identifier).execute()

    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")

    user = response.data[0]
    user.pop("passcode", None)
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

    user_row = supabase.table(Tables.PROFILES).select("id, banner_url").eq("name", current_user).execute()
    if not user_row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")

    user_id = user_row.data[0]["id"]
    old_url: str | None = user_row.data[0].get("banner_url")

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
    versioned_url = f"{public_url}?v={uuid.uuid4().hex[:8]}"

    supabase.table(Tables.PROFILES).update({"banner_url": versioned_url}).eq("name", current_user).execute()
    return {"url": versioned_url}


@router.delete("/banner", status_code=status.HTTP_204_NO_CONTENT)
def delete_banner(current_user: str = Depends(get_current_user)) -> None:
    """Remove the current user's banner image."""
    user_row = supabase.table(Tables.PROFILES).select("id, banner_url").eq("name", current_user).execute()
    if not user_row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")

    old_url: str | None = user_row.data[0].get("banner_url")
    if old_url:
        try:
            old_path = old_url.split(f"/public/{BANNER_BUCKET}/")[-1].split("?")[0]
            supabase.storage.from_(BANNER_BUCKET).remove([old_path])
        except Exception:
            pass

    supabase.table(Tables.PROFILES).update({"banner_url": None}).eq("name", current_user).execute()
