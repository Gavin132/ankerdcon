"""FastAPI dependency providers shared across routers."""
from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt

from app.config import Settings, get_settings
from app.core.database import supabase
from app.core.logging import get_logger
from app.services import discord_bot

logger = get_logger(__name__)

_bearer = HTTPBearer()

_JWT_ALGORITHM = "HS256"
_JWT_AUDIENCE = "authenticated"

_AUTH_FAILED = "Authenticatie mislukt."
_ACCESS_DENIED = "Toegang geweigerd. Neem contact op met een beheerder."
_DEACTIVATED = "Je account is gedeactiveerd. Neem contact op met een beheerder."
_TRY_AGAIN = "Kon niet controleren of je toegang hebt. Probeer het opnieuw."
_NOT_YOURSELF = "Je kunt dit alleen voor jezelf doen."

# How long a user's verified identities (see _verified_identity) are reused
# before Supabase is asked again. Identities only change when someone links
# or unlinks a provider, so a few minutes of staleness costs nothing.
_IDENTITY_TTL_SECONDS = 600
_IDENTITY_MISS_TTL_SECONDS = 60


def _strip_discriminator(name: str | None) -> str | None:
    """Discord retired the old username#discriminator format, but every migrated
    account was assigned discriminator "0" for backwards compatibility — the OAuth
    API still returns it literally as e.g. "someuser#0". Strip that trailing
    artifact so display names read clean."""
    if name and name.endswith("#0"):
        return name[:-2]
    return name


def _decode_token(token: str, jwt_secret: str) -> dict[str, Any] | None:
    """Verify and decode a Supabase JWT locally — no HTTP call to Supabase Auth.

    Returns the payload on success.
    Raises HTTP 401 if the token is definitively expired.
    Returns None for any other invalid token (e.g. wrong secret) so the caller can fall back.
    """
    try:
        return jwt.decode(
            token,
            jwt_secret,
            algorithms=[_JWT_ALGORITHM],
            audience=_JWT_AUDIENCE,
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ongeldige of verlopen sessie. Log opnieuw in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logger.debug("Local JWT decode failed, falling back to Supabase API: %s", e)
        return None


# ── Verified identities ───────────────────────────────────────────────────────
#
# A token's user_metadata must never decide who someone is: the signed-in user
# can rewrite it at will with supabase.auth.updateUser({ data: {...} }), and
# the next token they get carries whatever they wrote — a victim's Discord id
# as provider_id, for instance. The only trustworthy parts of a token are its
# signature and its `sub`. Everything else about the person (Discord id, email,
# names, avatar) is read from the identities Supabase itself recorded during
# the OAuth flow, via the admin API.

@dataclass(frozen=True)
class VerifiedIdentity:
    discord_id: str | None = None
    discord_username: str | None = None
    discord_display_name: str | None = None
    discord_avatar: str | None = None
    email: str | None = None  # only set once Supabase has confirmed it
    email_display_name: str | None = None
    email_avatar: str | None = None


_identity_cache: dict[str, tuple[float, VerifiedIdentity | None]] = {}
_identity_lock = threading.Lock()


def _verified_identity(user_id: str) -> VerifiedIdentity | None:
    """Everything Supabase verified about this auth user, or None when there is
    no such auth user (an impersonation token for a guest profile) or Supabase
    couldn't be reached."""
    now = time.monotonic()
    with _identity_lock:
        hit = _identity_cache.get(user_id)
    if hit and now < hit[0]:
        return hit[1]

    try:
        user = supabase.auth.admin.get_user_by_id(user_id).user
    except Exception as e:
        # Also what an impersonated guest profile (no auth user at all) ends
        # up here with — remember the miss briefly so its every request
        # doesn't ask Supabase again.
        logger.warning("Auth: could not fetch verified identities: %s", e)
        with _identity_lock:
            _identity_cache[user_id] = (now + _IDENTITY_MISS_TTL_SECONDS, None)
        return None

    identity: VerifiedIdentity | None = None
    if user:
        identities = user.identities or []
        discord = next((i for i in identities if i.provider == "discord"), None)
        other = next((i for i in identities if i.provider != "discord"), None)
        discord_data = (discord.identity_data or {}) if discord else {}
        other_data = (other.identity_data or {}) if other else {}
        identity = VerifiedIdentity(
            discord_id=(discord_data.get("provider_id") or discord.id) if discord else None,
            discord_username=_strip_discriminator(discord_data.get("preferred_username") or discord_data.get("name")),
            discord_display_name=discord_data.get("full_name") or discord_data.get("name"),
            discord_avatar=discord_data.get("avatar_url") or discord_data.get("picture"),
            email=user.email.lower() if user.email and user.email_confirmed_at else None,
            email_display_name=other_data.get("full_name") or other_data.get("name"),
            email_avatar=other_data.get("avatar_url") or other_data.get("picture"),
        )

    with _identity_lock:
        _identity_cache[user_id] = (now + _IDENTITY_TTL_SECONDS, identity)
    return identity


def _unique_profile_name(candidate: str) -> str:
    """A name for a new profile that nobody uses yet — not as their current
    name and not as a former one (alias), ignoring case. Rides, meals and
    trips record people by name, so a clash would hand the newcomer someone
    else's sign-ups. Discord usernames are unique on Discord, but not against
    Google display names or names people picked themselves here."""
    rows = supabase.table("profiles").select("name, aliases").execute().data or []
    taken = {n.casefold() for r in rows for n in [r.get("name"), *(r.get("aliases") or [])] if n}
    if candidate.casefold() not in taken:
        return candidate
    for suffix in range(2, 100):
        attempt = f"{candidate}{suffix}"
        if attempt.casefold() not in taken:
            return attempt
    return f"{candidate}-{uuid.uuid4().hex[:6]}"


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    settings: Settings = Depends(get_settings),
) -> str:
    """Validate the Supabase JWT, enforce the allowlist, and return the user's display name.

    Discord logins are identified by discord_id; every other provider (currently
    just Google) has no such stable Discord identity, so those are identified by
    email instead. Both paths enforce the same whitelist-gated auto-create flow.
    """
    token = credentials.credentials

    try:
        # Prefer local JWT verification (fast, no network call).
        # Falls back to Supabase Auth API if the secret is not set or decode fails.
        payload = _decode_token(token, settings.supabase_jwt_secret) if settings.supabase_jwt_secret else None
        if payload is not None:
            user_id = payload.get("sub") or ""
        else:
            user = supabase.auth.get_user(token).user
            user_id = user.id if user else ""

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=_AUTH_FAILED,
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Stable identity: profiles.id is the Supabase auth user id, which
        # stays the same no matter which linked provider authenticated this
        # session. Try this first so a returning user with more than one
        # linked provider is always found.
        try:
            existing = supabase.table("profiles").select(
                "name, is_active, is_first_login, allow_dm, discord_id, avatar_url, discord_username, email"
            ).eq("id", user_id).execute()
        except Exception as e:
            logger.warning("Auth: profile-by-id lookup failed, falling back: %s", e)
            existing = None

        if existing and existing.data:
            return _finalize_returning_user(existing.data[0], user_id, settings)

        identity = _verified_identity(user_id)
        if identity is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_TRY_AGAIN)
        if identity.discord_id:
            return _resolve_discord_user(identity, user_id, settings)
        return _resolve_email_user(identity, user_id, settings)

    except HTTPException:
        raise
    except Exception:
        logger.error("Auth: unexpected error during authentication", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_AUTH_FAILED,
            headers={"WWW-Authenticate": "Bearer"},
        )


def _finalize_returning_user(profile_row: dict, user_id: str, settings: Settings) -> str:
    """Runs the is_active check, first-login welcome DM, and a conservative
    backfill for a profile already found by its stable id — used for every
    returning user, regardless of which linked provider they signed in with
    this time.

    Backfill only ever fills a field that is currently empty; it never
    overwrites one that already has a value, and it only uses what Supabase
    verified (see _verified_identity).
    """
    profile_name = profile_row["name"]

    if profile_row.get("is_active") is False:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_DEACTIVATED)

    if profile_row.get("is_first_login"):
        try:
            supabase.table("profiles").update({"is_first_login": False}).eq("id", user_id).execute()
            existing_discord_id = profile_row.get("discord_id")
            if existing_discord_id and profile_row.get("allow_dm", True):
                discord_bot.send_welcome_dm(settings.discord_bot_token, existing_discord_id, profile_name)
        except Exception as e:
            logger.warning("Auth: first-login handling failed: %s", e)

    missing = [f for f in ("discord_id", "discord_username", "email", "avatar_url") if not profile_row.get(f)]
    if not missing:
        return profile_name

    try:
        identity = _verified_identity(user_id)
        if identity is None:
            return profile_name
        sync: dict = {}
        if "discord_id" in missing and identity.discord_id and not _discord_id_taken(identity.discord_id):
            sync["discord_id"] = identity.discord_id
        if "discord_username" in missing and identity.discord_username:
            sync["discord_username"] = identity.discord_username
        if "email" in missing and identity.email:
            sync["email"] = identity.email
        if "avatar_url" in missing:
            avatar = identity.discord_avatar or identity.email_avatar
            if avatar:
                sync["avatar_url"] = avatar
        if sync:
            supabase.table("profiles").update(sync).eq("id", user_id).execute()
    except Exception:
        pass  # a transient DB error — non-fatal

    return profile_name


def _discord_id_taken(discord_id: str) -> bool:
    resp = supabase.table("profiles").select("name").eq("discord_id", discord_id).execute()
    return bool(resp.data)


def _is_whitelisted(column: str, value: str) -> bool:
    try:
        wl = supabase.table("whitelist").select(column).eq(column, value).execute()
    except Exception as e:
        logger.error("Auth: whitelist check failed: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_TRY_AGAIN)
    return bool(wl.data)


def _resolve_discord_user(identity: VerifiedIdentity, user_id: str, settings: Settings) -> str:
    discord_id = identity.discord_id
    assert discord_id  # the caller only routes verified Discord identities here

    _select = "id, name, is_active, is_first_login, allow_dm, discord_id, avatar_url, discord_username"
    profile_row: dict | None = None
    profile_name: str | None = None
    _db_error = False

    for _attempt in range(2):
        profile_row = None
        profile_name = None
        _db_error = False

        try:
            resp = supabase.table("profiles").select(_select).eq("discord_id", discord_id).execute()
            if resp.data:
                profile_row = resp.data[0]
                profile_name = profile_row["name"]
        except Exception as e:
            logger.warning("Auth: discord_id lookup failed: %s", e)
            _db_error = True

        if profile_name is not None or not _db_error:
            break
        logger.warning("Auth: DB error on first attempt, retrying after 300ms")
        time.sleep(0.3)

    # If DB errors prevented lookup, fail with 401 rather than falling through to
    # profile creation (which would cause a duplicate-key 500 for existing users).
    if profile_name is None and _db_error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticatie mislukt. Probeer het opnieuw.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if profile_name is None:
        # Not linked to any profile yet — only allowlisted Discord accounts get in.
        if not _is_whitelisted("discord_id", discord_id):
            logger.info("Auth: discord_id %s not in whitelist", discord_id)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_ACCESS_DENIED)

        # An admin may have created a placeholder profile for this person ahead
        # of time (Admin › Gebruikers). It's only linked to a whitelisted
        # account whose Discord username is exactly its name, and only while
        # it has no login of its own yet (no Discord account, no email).
        # Setting the Discord ID on the placeholder is the surer way: then
        # it's found by ID above and the name doesn't matter.
        profile_row = _claim_stub_profile(identity, _select)
        if profile_row:
            profile_name = profile_row["name"]
            logger.info("Auth: linked Discord account %s to stub profile %s", discord_id, profile_name)
        else:
            profile_row = _create_profile({
                "id": user_id,
                "name": _unique_profile_name(
                    identity.discord_username
                    or _strip_discriminator(identity.discord_display_name)
                    or f"user_{user_id[:8]}"
                ),
                "discord_id": discord_id,
                "discord_username": identity.discord_username,
                "avatar_url": identity.discord_avatar,
            })
            profile_name = profile_row["name"]

    if profile_row.get("is_active") is False:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_DEACTIVATED)

    if profile_row.get("is_first_login"):
        try:
            supabase.table("profiles").update({"is_first_login": False}).eq("id", profile_row["id"]).execute()
            if profile_row.get("allow_dm", True):
                discord_bot.send_welcome_dm(settings.discord_bot_token, discord_id, profile_name)
        except Exception as e:
            logger.warning("Auth: first-login DM failed: %s", e)

    # Best-effort: keep Discord-owned fields current. Only write what changed —
    # this runs on every request for profiles whose id isn't the auth user id.
    try:
        sync: dict = {}
        if profile_row.get("discord_id") != discord_id:
            sync["discord_id"] = discord_id
        if identity.discord_avatar and profile_row.get("avatar_url") != identity.discord_avatar:
            sync["avatar_url"] = identity.discord_avatar
        if identity.discord_username and profile_row.get("discord_username") != identity.discord_username:
            sync["discord_username"] = identity.discord_username
        if sync:
            supabase.table("profiles").update(sync).eq("id", profile_row["id"]).execute()
    except Exception:
        pass  # non-fatal

    return profile_name


def _claim_stub_profile(identity: VerifiedIdentity, select: str) -> dict | None:
    # Only the Discord username: it's unique on Discord, unlike the display
    # name, which anyone can set to anything.
    candidates = [identity.discord_username] if identity.discord_username else []
    for candidate in candidates:
        try:
            resp = (
                supabase.table("profiles")
                .select(select)
                .eq("name", candidate)
                .is_("discord_id", "null")
                # A profile with an email is a real Google login, not a
                # placeholder — never hand that to a Discord account.
                .is_("email", "null")
                .execute()
            )
        except Exception as e:
            logger.warning("Auth: stub profile lookup failed: %s", e)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_TRY_AGAIN)
        if resp.data:
            return resp.data[0]
    return None


def _create_profile(fields: dict) -> dict:
    insert_data = {
        "is_active": True,
        "is_first_login": True,
        "allow_dm": True,
        **{k: v for k, v in fields.items() if v},
    }
    try:
        resp = supabase.table("profiles").insert(insert_data).execute()
    except Exception as e:
        logger.error("Auth: auto-create profile failed: %s", e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Profiel aanmaken mislukt.")
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Profiel aanmaken mislukt.")
    logger.info("Auth: auto-created profile for %s", insert_data["name"])
    return resp.data[0]


def _resolve_email_user(identity: VerifiedIdentity, user_id: str, settings: Settings) -> str:
    """Non-Discord providers (currently just Google) have no discord_id, so the
    confirmed email address is the stable identity instead — mirrors
    _resolve_discord_user's lookup -> whitelist -> auto-create -> active-check
    -> backfill flow."""
    email = identity.email
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_AUTH_FAILED,
            headers={"WWW-Authenticate": "Bearer"},
        )

    _select = "id, name, is_active, is_first_login, allow_dm, avatar_url, email"
    profile_row: dict | None = None
    profile_name: str | None = None
    _db_error = False

    for _attempt in range(2):
        profile_row = None
        profile_name = None
        _db_error = False
        try:
            resp = supabase.table("profiles").select(_select).eq("email", email).execute()
            if resp.data:
                profile_row = resp.data[0]
                profile_name = profile_row["name"]
        except Exception as e:
            logger.warning("Auth: email lookup failed: %s", e)
            _db_error = True

        if profile_name is not None or not _db_error:
            break
        logger.warning("Auth: DB error on first attempt, retrying after 300ms")
        time.sleep(0.3)

    if profile_name is None and _db_error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticatie mislukt. Probeer het opnieuw.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if profile_name is None:
        if not _is_whitelisted("email", email):
            logger.info("Auth: email %s not in whitelist", email)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_ACCESS_DENIED)
        profile_row = _create_profile({
            "id": user_id,
            "name": _unique_profile_name(identity.email_display_name or email.split("@")[0]),
            "email": email,
            "avatar_url": identity.email_avatar,
        })
        profile_name = profile_row["name"]

    if profile_row.get("is_active") is False:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_DEACTIVATED)

    # No discord_id to send a welcome DM to — just clear the flag.
    if profile_row.get("is_first_login"):
        try:
            supabase.table("profiles").update({"is_first_login": False}).eq("id", profile_row["id"]).execute()
        except Exception as e:
            logger.warning("Auth: clearing is_first_login failed: %s", e)

    try:
        if identity.email_avatar and profile_row.get("avatar_url") != identity.email_avatar:
            supabase.table("profiles").update({"avatar_url": identity.email_avatar}).eq("id", profile_row["id"]).execute()
    except Exception:
        pass

    return profile_name


def _is_admin(name: str) -> bool:
    try:
        resp = supabase.table("profiles").select("is_admin").eq("name", name).execute()
    except Exception as e:
        logger.error("Admin check failed for %s: %s", name, e)
        return False
    return bool(resp.data and resp.data[0].get("is_admin"))


def get_admin_user(current_user: str = Depends(get_current_user)) -> str:
    """Extends get_current_user — additionally requires is_admin = true on the profile row."""
    if not _is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Toegang geweigerd. Alleen admins hebben toegang tot dit gedeelte.",
        )
    return current_user


def act_as(current_user: str, requested: str | None) -> str:
    """The name an action is performed for. Members only ever act for
    themselves; admins may name someone else. Every endpoint that takes a
    user name from the request (RSVPs, ride seats, "paid by", …) routes it
    through here instead of trusting it."""
    if not requested or requested == current_user:
        return current_user
    if _is_admin(current_user) or _is_own_former_name(current_user, requested):
        return requested
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_NOT_YOURSELF)


def _is_own_former_name(current_user: str, name: str) -> bool:
    """Older RSVPs and seats still carry someone's name from before a rename,
    which lives on in their aliases — leaving a trip clears those too. Members
    edit their own alias list, so an alias only counts while no other profile
    goes by that name."""
    try:
        me = supabase.table("profiles").select("aliases").eq("name", current_user).execute()
        if name not in ((me.data[0].get("aliases") or []) if me.data else []):
            return False
        return not supabase.table("profiles").select("name").eq("name", name).execute().data
    except Exception as e:
        logger.error("Alias check failed for %s: %s", current_user, e)
        return False


def require_owner_or_admin(current_user: str, owner: str | None, detail: str) -> None:
    """For changing or deleting something someone else created."""
    if owner and owner == current_user:
        return
    if _is_admin(current_user):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)
