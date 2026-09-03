from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.constants import Tables
from app.core.logging import get_logger
from app.dependencies import get_current_user, _strip_discriminator
from app.models.user import CompleteOnboardingRequest, LocationPingRequest, UpdateNameRequest, UpdatePreferencesRequest, User
from app.routes import UserRoutes
from app.core.database import supabase

logger = get_logger(__name__)

BANNER_BUCKET = "banners"
BANNER_MAX_BYTES = 8 * 1024 * 1024  # 8 MB
BANNER_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
BANNER_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp"}

router = APIRouter(prefix=UserRoutes.PREFIX, tags=["users"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."


@router.get(UserRoutes.NAMES, response_model=list[str])
def list_names() -> list[str]:
    """Public endpoint — returns only names for the login name picker."""
    try:
        response = supabase.table(Tables.PROFILES).select("name").execute()
        return [row["name"] for row in response.data if row.get("name") and str(row.get("name")).strip()]
    except Exception as e:
        logger.error("Failed to list user names: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.get(UserRoutes.LIST, response_model=list[User])
def list_all_users_safely(_: str = Depends(get_current_user)) -> list[User]:
    """Fetch all users — scrubs sensitive fields before returning."""
    try:
        response = supabase.table(Tables.PROFILES).select("*").execute()
    except Exception as e:
        logger.error("Failed to list users: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    safe_users = []
    for user in response.data:
        user.pop("passcode", None)
        safe_users.append(user)
    return safe_users


@router.put(UserRoutes.PREFERENCES, status_code=status.HTTP_204_NO_CONTENT)
def update_preferences(
    body: UpdatePreferencesRequest,
    current_user: str = Depends(get_current_user),
) -> None:
    updates = {k: v for k, v in {
        "color":                   body.color,
        "font":                    body.font,
        "bio":                     body.bio,
        "banner_color":            body.banner_color,
        "banner_position":         body.banner_position,
        "pronouns":                body.pronouns,
        "phone_number":            body.phone_number,
        "aliases":                 body.aliases,
        "allow_dm":                body.allow_dm,
        "show_greeting":           body.show_greeting,
        "notification_categories": body.notification_categories,
    }.items() if v is not None}

    if not updates:
        return

    try:
        response = supabase.table(Tables.PROFILES).update(updates).eq("name", current_user).execute()
    except Exception as e:
        logger.error("Failed to update preferences for %s: %s", current_user, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")


@router.patch(UserRoutes.NAME, status_code=status.HTTP_204_NO_CONTENT)
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

    try:
        existing = supabase.table(Tables.PROFILES).select("name").eq("name", new_name).execute()
    except Exception as e:
        logger.error("Failed to check name uniqueness for %s: %s", new_name, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Deze naam is al in gebruik door een ander account.",
        )

    try:
        profile_row = supabase.table(Tables.PROFILES).select("aliases").eq("name", current_user).execute()
    except Exception as e:
        logger.error("Failed to fetch aliases for %s: %s", current_user, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    current_aliases: list[str] = (profile_row.data[0].get("aliases") or []) if profile_row.data else []
    if current_user not in current_aliases:
        current_aliases = current_aliases + [current_user]

    try:
        response = supabase.table(Tables.PROFILES).update({
            "name": new_name,
            "aliases": current_aliases,
        }).eq("name", current_user).execute()
    except Exception as e:
        logger.error("Failed to update name for %s: %s", current_user, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")


@router.put(UserRoutes.LOCATION, status_code=status.HTTP_204_NO_CONTENT)
def ping_location(
    identifier: str,
    body: LocationPingRequest,
    current_user: str = Depends(get_current_user),
) -> None:
    """Update the live location ping for a user."""
    now = datetime.now().strftime("%H:%M")
    base = f"{body.zone}|{body.text}" if body.text else body.zone
    value = f"{base} (at {now})"
    try:
        response = supabase.table(Tables.PROFILES).update({"live_location_ping": value}).eq("name", identifier).execute()
    except Exception as e:
        logger.error("Failed to update location ping for %s: %s", identifier, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")


@router.post(UserRoutes.ONBOARDING, status_code=status.HTTP_204_NO_CONTENT)
def complete_onboarding(
    body: CompleteOnboardingRequest,
    current_user: str = Depends(get_current_user),
) -> None:
    """Mark onboarding as completed and save initial profile preferences."""
    updates: dict = {"onboarding_completed": True, "allow_dm": body.allow_dm}
    if body.pronouns is not None:
        updates["pronouns"] = body.pronouns
    if body.bio is not None:
        updates["bio"] = body.bio
    if body.phone_number is not None:
        updates["phone_number"] = body.phone_number
    if body.color is not None:
        updates["color"] = body.color
    if body.banner_color is not None:
        updates["banner_color"] = body.banner_color
    if body.aliases is not None:
        updates["aliases"] = body.aliases
    if body.notification_categories is not None:
        updates["notification_categories"] = body.notification_categories

    try:
        supabase.table(Tables.PROFILES).update(updates).eq("name", current_user).execute()
    except Exception as e:
        logger.error("Failed to complete onboarding for %s: %s", current_user, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.get(UserRoutes.ME, response_model=User)
def get_me(current_user: str = Depends(get_current_user)) -> User:
    """Return the full profile for the currently authenticated user."""
    try:
        response = supabase.table(Tables.PROFILES).select("*").eq("name", current_user).execute()
    except Exception as e:
        logger.error("Failed to fetch profile for %s: %s", current_user, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profiel niet gevonden.")
    user = response.data[0]
    user.pop("passcode", None)
    return user


@router.post(UserRoutes.LINK_DISCORD, response_model=User)
def link_discord(current_user: str = Depends(get_current_user)) -> User:
    """Attach a Discord identity to the current (Google-signed-in) profile.

    The frontend calls supabase.auth.linkIdentity({provider: "discord"}) first,
    which sends the browser through Discord's OAuth flow and, on success,
    attaches that identity to the *same* Supabase auth user — no new login,
    no new profile. This endpoint then syncs it onto the profile row.

    Deliberately doesn't trust anything about the Discord identity from the
    client — it re-fetches the user's real identities from Supabase's admin
    API (the backend already holds the service-role key for this) so there's
    no way to claim a discord_id you don't actually control.
    """
    try:
        resp = supabase.table(Tables.PROFILES).select("id, discord_id, avatar_url").eq("name", current_user).execute()
    except Exception as e:
        logger.error("Link Discord: failed to fetch profile for %s: %s", current_user, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profiel niet gevonden.")
    profile = resp.data[0]

    if profile.get("discord_id"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Er is al een Discord-account gekoppeld.")

    try:
        auth_user = supabase.auth.admin.get_user_by_id(profile["id"]).user
    except Exception as e:
        logger.error("Link Discord: failed to fetch auth identities for %s: %s", current_user, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    discord_identity = next((i for i in (auth_user.identities or []) if i.provider == "discord"), None)
    if not discord_identity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Geen Discord-account gevonden. Probeer het opnieuw te koppelen.",
        )

    data = discord_identity.identity_data or {}
    discord_id = data.get("provider_id") or discord_identity.id
    discord_username = _strip_discriminator(data.get("preferred_username") or data.get("full_name") or data.get("name"))
    discord_avatar = data.get("avatar_url") or data.get("picture")

    try:
        clash = supabase.table(Tables.PROFILES).select("name").eq("discord_id", discord_id).execute()
    except Exception as e:
        logger.error("Link Discord: uniqueness check failed for %s: %s", current_user, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if clash.data and clash.data[0]["name"] != current_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Dit Discord-account is al aan een ander profiel gekoppeld.",
        )

    update: dict = {"discord_id": discord_id}
    if discord_username:
        update["discord_username"] = discord_username
    if discord_avatar and not profile.get("avatar_url"):
        update["avatar_url"] = discord_avatar  # don't override a custom avatar they already set

    try:
        updated = supabase.table(Tables.PROFILES).update(update).eq("name", current_user).execute()
    except Exception as e:
        logger.error("Link Discord: failed to update profile for %s: %s", current_user, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    logger.info("Auth: linked Discord account %s to profile %s", discord_id, current_user)
    return updated.data[0]


@router.get(UserRoutes.DETAIL, response_model=User)
def get_user(identifier: str, _: str = Depends(get_current_user)) -> User:
    """Fetch a single user by either their secure UUID or their readable name."""
    try:
        uuid.UUID(identifier)
        is_uuid = True
    except ValueError:
        is_uuid = False

    try:
        if is_uuid:
            response = supabase.table(Tables.PROFILES).select("*").eq("id", identifier).execute()
        else:
            response = supabase.table(Tables.PROFILES).select("*").eq("name", identifier).execute()
    except Exception as e:
        logger.error("Failed to fetch user %s: %s", identifier, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")

    user = response.data[0]
    user.pop("passcode", None)
    return user


@router.post(UserRoutes.BANNER, response_model=dict)
async def upload_banner(
    file: UploadFile = File(...),
    position: str | None = Form(None),
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

    try:
        user_row = supabase.table(Tables.PROFILES).select("id, banner_url").eq("name", current_user).execute()
    except Exception as e:
        logger.error("Failed to fetch profile for banner upload (%s): %s", current_user, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not user_row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")

    user_id = user_row.data[0]["id"]
    old_url: str | None = user_row.data[0].get("banner_url")

    if old_url:
        try:
            old_path = old_url.split(f"/public/{BANNER_BUCKET}/")[-1].split("?")[0]
            supabase.storage.from_(BANNER_BUCKET).remove([old_path])
        except Exception:
            pass  # non-fatal — old banner cleanup is best-effort

    ext = BANNER_EXT.get(file.content_type, "jpg")
    path = f"{user_id}/banner.{ext}"

    try:
        supabase.storage.from_(BANNER_BUCKET).upload(
            path,
            content,
            {"upsert": "true", "content-type": file.content_type},
        )
    except Exception as e:
        logger.error("Storage upload failed for user %s: %s", current_user, e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Uploaden mislukt. Probeer het opnieuw.",
        )

    try:
        public_url = supabase.storage.from_(BANNER_BUCKET).get_public_url(path)
        versioned_url = f"{public_url}?v={uuid.uuid4().hex[:8]}"
        supabase.table(Tables.PROFILES).update({
            "banner_url": versioned_url,
            "banner_position": position or None,
        }).eq("name", current_user).execute()
    except Exception as e:
        logger.error("Failed to save banner URL for user %s: %s", current_user, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    return {"url": versioned_url}


@router.delete(UserRoutes.BANNER, status_code=status.HTTP_204_NO_CONTENT)
def delete_banner(current_user: str = Depends(get_current_user)) -> None:
    """Remove the current user's banner image."""
    try:
        user_row = supabase.table(Tables.PROFILES).select("id, banner_url").eq("name", current_user).execute()
    except Exception as e:
        logger.error("Failed to fetch profile for banner delete (%s): %s", current_user, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not user_row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")

    old_url: str | None = user_row.data[0].get("banner_url")
    if old_url:
        try:
            old_path = old_url.split(f"/public/{BANNER_BUCKET}/")[-1].split("?")[0]
            supabase.storage.from_(BANNER_BUCKET).remove([old_path])
        except Exception:
            pass  # non-fatal

    try:
        supabase.table(Tables.PROFILES).update({"banner_url": None, "banner_position": None}).eq("name", current_user).execute()
    except Exception as e:
        logger.error("Failed to clear banner URL for user %s: %s", current_user, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
