from datetime import datetime, timezone
import json
import uuid

from fastapi.concurrency import run_in_threadpool
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.constants import Tables
from app.core import minio_client
from app.core.logging import get_logger
from app.core.uploads import clean_image, read_capped
from app.dependencies import act_as, get_current_user, _strip_discriminator
from app.models.user import CompleteOnboardingRequest, LocationPingRequest, UpdateNameRequest, UpdatePreferencesRequest, User
from app.routes import UserRoutes
from app.core.database import supabase

logger = get_logger(__name__)

# Banners used to live in this Supabase Storage bucket; new ones go to MinIO.
LEGACY_BANNER_BUCKET = "banners"
BANNER_MAX_BYTES = 8 * 1024 * 1024  # 8 MB
BANNER_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}

router = APIRouter(prefix=UserRoutes.PREFIX, tags=["users"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."


def _remove_banner_file(url: str | None) -> None:
    """Best-effort cleanup of a replaced or removed banner, wherever it lives."""
    if not url:
        return
    try:
        if key := minio_client.key_from_url(url):
            minio_client.delete_object(key)
        elif f"/public/{LEGACY_BANNER_BUCKET}/" in url:
            path = url.split(f"/public/{LEGACY_BANNER_BUCKET}/")[-1].split("?")[0]
            supabase.storage.from_(LEGACY_BANNER_BUCKET).remove([path])
    except Exception:
        pass  # non-fatal


def _names_claimed_by_others(names: list[str], current_user: str) -> list[str]:
    """Names that already belong to someone else — as their current name or
    one of their former names (aliases). Rides, meals and trips record people
    by name, so claiming one of those would hand you their sign-ups."""
    wanted = {n.strip().casefold(): n for n in names if n and n.strip()}
    if not wanted:
        return []
    try:
        rows = supabase.table(Tables.PROFILES).select("name, aliases").execute().data
    except Exception as e:
        logger.error("Failed to check names against other profiles: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    taken: set[str] = set()
    for row in rows:
        if row["name"] == current_user:
            continue
        taken.update(n.casefold() for n in [row["name"], *(row.get("aliases") or [])] if n)
    return [original for key, original in wanted.items() if key in taken]


def _reject_claimed_aliases(aliases: list[str] | None, current_user: str) -> None:
    if not aliases:
        return
    # Only aliases being added now: an overlap already in older data
    # shouldn't stop someone from saving the rest of their profile.
    try:
        row = supabase.table(Tables.PROFILES).select("aliases").eq("name", current_user).execute()
    except Exception as e:
        logger.error("Failed to fetch aliases for %s: %s", current_user, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    existing = set((row.data[0].get("aliases") or []) if row.data else [])
    claimed = _names_claimed_by_others([a for a in aliases if a not in existing], current_user)
    if claimed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Deze naam hoort al bij een ander account: {', '.join(claimed)}.",
        )


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
    _reject_claimed_aliases(body.aliases, current_user)

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

    if existing.data or _names_claimed_by_others([new_name], current_user):
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
    """Update the live location ping for a user.

    Stored as JSON in the existing `live_location_ping` text column: zone, note,
    an ISO timestamp (the frontend hides pings after a couple of hours) and the
    optional coordinates. Older pings are plain "zone|text (at HH:MM)" strings,
    which the frontend still understands.
    """
    identifier = act_as(current_user, identifier)
    ping: dict = {
        "zone": body.zone.strip(),
        "text": body.text.strip(),
        "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    if body.lat is not None and body.lng is not None:
        ping["lat"] = round(body.lat, 5)
        ping["lng"] = round(body.lng, 5)
        if body.accuracy is not None:
            ping["accuracy"] = round(body.accuracy)
    value = json.dumps(ping, ensure_ascii=False)
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
        _reject_claimed_aliases(body.aliases, current_user)
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


def _store_banner(current_user: str, position: str | None, content: bytes) -> dict:
    content, content_type, ext = clean_image(content, {"JPEG", "PNG", "WEBP", "GIF"})

    try:
        user_row = supabase.table(Tables.PROFILES).select("id, banner_url").eq("name", current_user).execute()
    except Exception as e:
        logger.error("Failed to fetch profile for banner upload (%s): %s", current_user, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not user_row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")

    user_id = user_row.data[0]["id"]
    old_url: str | None = user_row.data[0].get("banner_url")

    # A new name per upload, so browsers and the CDN never show a cached old one.
    key = f"banners/{user_id}/{uuid.uuid4().hex}.{ext}"
    try:
        url = minio_client.upload_bytes(key, content, content_type)
    except RuntimeError as e:
        logger.error("Banner upload failed (MinIO not configured): %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.error("MinIO banner upload failed for user %s: %s", current_user, e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Uploaden mislukt. Probeer het opnieuw.",
        )

    try:
        supabase.table(Tables.PROFILES).update({
            "banner_url": url,
            "banner_position": position or None,
        }).eq("name", current_user).execute()
    except Exception as e:
        logger.error("Failed to save banner URL for user %s: %s", current_user, e)
        try:
            minio_client.delete_object(key)
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    # Only now that the new banner is saved: remove the one it replaces.
    _remove_banner_file(old_url)
    return {"url": url}


@router.post(UserRoutes.BANNER, response_model=dict)
async def upload_banner(
    file: UploadFile = File(...),
    position: str | None = Form(None),
    current_user: str = Depends(get_current_user),
) -> dict:
    """Upload a banner image/GIF for the current user to MinIO."""
    if file.content_type not in BANNER_ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Bestandstype niet toegestaan. Gebruik JPG, PNG, GIF of WebP.",
        )

    content = await read_capped(file, BANNER_MAX_BYTES)
    return await run_in_threadpool(_store_banner, current_user, position, content)


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
    _remove_banner_file(old_url)

    try:
        supabase.table(Tables.PROFILES).update({"banner_url": None, "banner_position": None}).eq("name", current_user).execute()
    except Exception as e:
        logger.error("Failed to clear banner URL for user %s: %s", current_user, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
