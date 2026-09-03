"""FastAPI dependency providers shared across routers."""
from __future__ import annotations

import time
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError
from jose import jwt as jose_jwt

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

# Supabase stamps the identity provider's own issuer into user_metadata.iss —
# unlike app_metadata.provider (pinned to whichever provider created the
# account, never updated after) this gets overwritten on every sign-in with
# whichever linked provider actually authenticated that session, so it's the
# only reliable way to tell which provider is "live" right now once an
# account has more than one linked (Supabase auto-links accounts that share
# a verified email across providers).
_DISCORD_ISSUER = "https://discord.com/api"


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
    Returns None for any other JWTError (e.g. wrong secret) so the caller can fall back.
    """
    try:
        return jose_jwt.decode(
            token,
            jwt_secret,
            algorithms=[_JWT_ALGORITHM],
            audience=_JWT_AUDIENCE,
        )
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ongeldige of verlopen sessie. Log opnieuw in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        logger.debug("Local JWT decode failed, falling back to Supabase API: %s", e)
        return None


def _unique_profile_name(candidate: str) -> str:
    """Discord usernames are unique enough in practice that name collisions were
    never handled — but a Google/email display name (or an email's local part)
    collides much more easily, so a fresh non-Discord signup needs a fallback."""
    if not supabase.table("profiles").select("name").eq("name", candidate).execute().data:
        return candidate
    for suffix in range(2, 6):
        attempt = f"{candidate}{suffix}"
        if not supabase.table("profiles").select("name").eq("name", attempt).execute().data:
            return attempt
    return candidate  # give up disambiguating; the insert will surface a clear conflict


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
            meta = payload.get("user_metadata") or {}
            app_meta = payload.get("app_metadata") or {}
            user_id = payload.get("sub") or ""
            token_email = payload.get("email")
        else:
            auth_response = supabase.auth.get_user(token)
            user = auth_response.user
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=_AUTH_FAILED,
                    headers={"WWW-Authenticate": "Bearer"},
                )
            meta = user.user_metadata or {}
            app_meta = user.app_metadata or {}
            user_id = user.id
            token_email = user.email

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=_AUTH_FAILED,
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Stable identity: profiles.id is the Supabase auth user id, which
        # stays the same no matter which linked provider authenticated this
        # session. Try this first so a returning user with more than one
        # linked provider is always found — otherwise, once Discord and
        # Google get auto-linked to the same account, resolving by
        # discord_id/name/email from (session-dependent) metadata can miss
        # the existing profile entirely and either deny access or create a
        # duplicate.
        try:
            existing = supabase.table("profiles").select(
                "name, is_active, is_first_login, allow_dm, discord_id, avatar_url, discord_username, email"
            ).eq("id", user_id).execute()
        except Exception as e:
            logger.warning("Auth: profile-by-id lookup failed, falling back: %s", e)
            existing = None

        if existing and existing.data:
            return _finalize_returning_user(existing.data[0], meta, user_id, settings)

        if meta.get("iss") == _DISCORD_ISSUER or app_meta.get("provider") == "discord":
            return _resolve_discord_user(meta, user_id, settings)
        return _resolve_email_user(meta, token_email, user_id, settings)

    except HTTPException:
        raise
    except Exception:
        logger.error("Auth: unexpected error during authentication", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_AUTH_FAILED,
            headers={"WWW-Authenticate": "Bearer"},
        )


def _finalize_returning_user(profile_row: dict, meta: dict, user_id: str, settings: Settings) -> str:
    """Runs the is_active check, first-login welcome DM, and a conservative
    backfill for a profile already found by its stable id — used for every
    returning user, regardless of which linked provider they signed in with
    this time.

    Backfill only ever fills a field that is currently empty; it never
    overwrites one that already has a value. That matters because meta here
    reflects whichever linked provider authenticated most recently, so on an
    account with two linked providers it can just as easily be Google's data
    as Discord's — blindly trusting it to overwrite discord_id/discord_username
    would risk clobbering the real Discord identity with the other provider's
    values the next time that person happens to sign in via Google.
    """
    profile_name = profile_row["name"]

    if profile_row.get("is_active") is False:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_DEACTIVATED)

    if profile_row.get("is_first_login"):
        try:
            supabase.table("profiles").update({"is_first_login": False}).eq("id", user_id).execute()
            # Use the profile's own stored discord_id for the welcome DM, not
            # meta's — meta may belong to whichever provider was used this
            # session, which isn't necessarily Discord.
            existing_discord_id = profile_row.get("discord_id")
            if existing_discord_id and profile_row.get("allow_dm", True):
                discord_bot.send_welcome_dm(settings.discord_bot_token, existing_discord_id, profile_name)
        except Exception as e:
            logger.warning("Auth: first-login handling failed: %s", e)

    try:
        sync: dict = {}
        if meta.get("iss") == _DISCORD_ISSUER:
            if not profile_row.get("discord_id") and meta.get("provider_id"):
                sync["discord_id"] = meta["provider_id"]
            if not profile_row.get("discord_username"):
                discord_username = _strip_discriminator(meta.get("preferred_username") or meta.get("name"))
                if discord_username:
                    sync["discord_username"] = discord_username
        else:
            if not profile_row.get("email") and meta.get("email"):
                sync["email"] = meta["email"].lower()
        if not profile_row.get("avatar_url"):
            avatar = meta.get("avatar_url") or meta.get("picture")
            if avatar:
                sync["avatar_url"] = avatar
        if sync:
            supabase.table("profiles").update(sync).eq("id", user_id).execute()
    except Exception:
        pass  # columns don't exist yet, or a transient DB error — non-fatal

    return profile_name


def _resolve_discord_user(meta: dict, user_id: str, settings: Settings) -> str:
    discord_display_name = meta.get("full_name") or meta.get("name")

    if not discord_display_name:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_AUTH_FAILED,
            headers={"WWW-Authenticate": "Bearer"},
        )

    discord_id       = meta.get("provider_id")
    discord_avatar   = meta.get("avatar_url") or meta.get("picture")
    discord_username = _strip_discriminator(meta.get("preferred_username") or meta.get("name"))

    # All name fields Discord may populate (tried in order)
    discord_names = list(dict.fromkeys(filter(None, [
        meta.get("full_name"),
        meta.get("name"),
        meta.get("preferred_username"),
    ])))

    profile_name: str | None = None

    # ── 1 & 2. Profile lookup with one retry on transient DB failure ──────
    # discord_id/avatar_url/discord_username are selected here (not just
    # name/is_active/...) so step 3 below can skip its UPDATE when they
    # already match — this dependency runs on every authenticated
    # request, so an unconditional write here was costing every single
    # API call a second DB round-trip for values that rarely change.
    _select = "name, is_active, is_first_login, allow_dm, discord_id, avatar_url, discord_username"
    profile_row: dict | None = None
    _db_error = False

    for _attempt in range(2):
        profile_row = None
        profile_name = None
        _db_error = False

        # Stable lookup by discord_id (works even after a name change)
        if discord_id:
            try:
                resp = supabase.table("profiles").select(_select).eq("discord_id", discord_id).execute()
                if resp.data:
                    profile_row = resp.data[0]
                    profile_name = profile_row["name"]
                    logger.debug("Auth: found profile by discord_id")
                else:
                    logger.debug("Auth: discord_id lookup returned no rows")
            except Exception as e:
                logger.warning("Auth: discord_id lookup failed: %s", e)
                _db_error = True

        # Fall back to Discord display name (first-time / pre-migration)
        if profile_name is None and not _db_error:
            for candidate in discord_names:
                try:
                    resp = supabase.table("profiles").select(_select).eq("name", candidate).execute()
                    if resp.data:
                        profile_row = resp.data[0]
                        profile_name = profile_row["name"]
                        break
                except Exception as e:
                    logger.warning("Auth: name lookup failed: %s", e)
                    _db_error = True
                    break

        if profile_name is not None:
            break

        if _attempt == 0:
            if _db_error:
                logger.warning("Auth: DB error on first attempt, retrying after 300ms")
            else:
                logger.debug("Auth: profile not found on first attempt, retrying after 300ms")
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
        # No existing profile — check whitelist before creating one.
        if not discord_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_ACCESS_DENIED)
        try:
            wl = supabase.table("whitelist").select("discord_id").eq("discord_id", discord_id).execute()
        except Exception as e:
            logger.error("Auth: whitelist check failed: %s", e)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_TRY_AGAIN)
        if not wl.data:
            logger.info("Auth: discord_id %s not in whitelist", discord_id)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_ACCESS_DENIED)
        try:
            new_name = (
                discord_username
                or _strip_discriminator(discord_display_name)
                or f"user_{user_id[:8]}"
            )
            insert_data: dict = {
                "id": user_id,
                "name": new_name,
                "is_active": True,
                "is_first_login": True,
                "allow_dm": True,
                "discord_id": discord_id,
            }
            if discord_avatar:
                insert_data["avatar_url"] = discord_avatar
            if discord_username:
                insert_data["discord_username"] = discord_username
            resp = supabase.table("profiles").insert(insert_data).execute()
            if resp.data:
                profile_row = resp.data[0]
                profile_name = new_name
                logger.info("Auth: auto-created profile for %s", new_name)
            else:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Profiel aanmaken mislukt.")
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Auth: auto-create profile failed: %s", e)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Profiel aanmaken mislukt.")

    # ── 2b. Check if account is active ───────────────────────────────────
    if profile_row and profile_row.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=_DEACTIVATED,
        )

    # ── 2c. First login — send welcome DM once ───────────────────────────
    if profile_row and profile_row.get("is_first_login") and discord_id:
        try:
            supabase.table("profiles").update({"is_first_login": False}).eq("name", profile_name).execute()
            if profile_row.get("allow_dm", True):
                discord_bot.send_welcome_dm(settings.discord_bot_token, discord_id, profile_name)
        except Exception as e:
            logger.warning("Auth: first-login DM failed: %s", e)

    # ── 3. Best-effort: backfill discord_id + avatar_url ─────────────────
    # Only write fields that actually changed from what's stored — the
    # profile row was already fetched with these columns in step 1, so
    # comparing here is free.
    try:
        sync: dict = {}
        if discord_id and profile_row.get("discord_id") != discord_id:
            sync["discord_id"] = discord_id
        if discord_avatar and profile_row.get("avatar_url") != discord_avatar:
            sync["avatar_url"] = discord_avatar
        if discord_username and profile_row.get("discord_username") != discord_username:
            sync["discord_username"] = discord_username
        if sync:
            supabase.table("profiles").update(sync).eq("name", profile_name).execute()
    except Exception:
        pass  # columns don't exist yet — non-fatal

    return profile_name


def _resolve_email_user(meta: dict, email: str | None, user_id: str, settings: Settings) -> str:
    """Non-Discord providers (currently just Google) have no discord_id, so the
    email address is the stable identity instead — mirrors _resolve_discord_user's
    lookup -> whitelist -> auto-create -> active-check -> backfill flow."""
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_AUTH_FAILED,
            headers={"WWW-Authenticate": "Bearer"},
        )
    email = email.lower()

    display_name = meta.get("full_name") or meta.get("name")
    avatar = meta.get("avatar_url") or meta.get("picture")

    _select = "name, is_active, is_first_login, allow_dm, avatar_url, email"
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
        # No existing profile — check whitelist before creating one.
        try:
            wl = supabase.table("whitelist").select("email").eq("email", email).execute()
        except Exception as e:
            logger.error("Auth: whitelist check failed: %s", e)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_TRY_AGAIN)
        if not wl.data:
            logger.info("Auth: email %s not in whitelist", email)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_ACCESS_DENIED)
        try:
            candidate = display_name or email.split("@")[0]
            new_name = _unique_profile_name(candidate)
            insert_data: dict = {
                "id": user_id,
                "name": new_name,
                "is_active": True,
                "is_first_login": True,
                "allow_dm": True,
                "email": email,
            }
            if avatar:
                insert_data["avatar_url"] = avatar
            resp = supabase.table("profiles").insert(insert_data).execute()
            if resp.data:
                profile_row = resp.data[0]
                profile_name = new_name
                logger.info("Auth: auto-created profile for %s (email login)", new_name)
            else:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Profiel aanmaken mislukt.")
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Auth: auto-create profile failed: %s", e)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Profiel aanmaken mislukt.")

    if profile_row and profile_row.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=_DEACTIVATED,
        )

    # No discord_id to send a welcome DM to — just clear the flag.
    if profile_row and profile_row.get("is_first_login"):
        try:
            supabase.table("profiles").update({"is_first_login": False}).eq("name", profile_name).execute()
        except Exception as e:
            logger.warning("Auth: clearing is_first_login failed: %s", e)

    try:
        sync: dict = {}
        if profile_row.get("email") != email:
            sync["email"] = email
        if avatar and profile_row.get("avatar_url") != avatar:
            sync["avatar_url"] = avatar
        if sync:
            supabase.table("profiles").update(sync).eq("name", profile_name).execute()
    except Exception:
        pass

    return profile_name


def get_admin_user(current_user: str = Depends(get_current_user)) -> str:
    """Extends get_current_user — additionally requires is_admin = true on the profile row."""
    try:
        resp = supabase.table("profiles").select("is_admin").eq("name", current_user).execute()
        if not resp.data or not resp.data[0].get("is_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Toegang geweigerd. Alleen admins hebben toegang tot dit gedeelte.",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Admin check failed for %s: %s", current_user, e)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Toegang geweigerd. Alleen admins hebben toegang tot dit gedeelte.",
        )
    return current_user
