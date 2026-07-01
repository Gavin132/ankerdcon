"""FastAPI dependency providers shared across routers."""

from __future__ import annotations

import time
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from jose import jwt as jose_jwt

from app.config import Settings, get_settings
from app.core.database import supabase
from app.services import discord_bot

_bearer = HTTPBearer()

_JWT_ALGORITHM = "HS256"
_JWT_AUDIENCE = "authenticated"


def _decode_token(token: str, jwt_secret: str) -> dict[str, Any]:
    """Verify and decode a Supabase JWT locally — no HTTP call to Supabase Auth."""
    try:
        return jose_jwt.decode(
            token,
            jwt_secret,
            algorithms=[_JWT_ALGORITHM],
            audience=_JWT_AUDIENCE,
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ongeldige of verlopen sessie. Log opnieuw in.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    settings: Settings = Depends(get_settings),
) -> str:
    """Validate the Supabase JWT, enforce the allowlist, and return the user's display name.

    After the allowlist check passes, attempts to backfill discord_id + avatar_url into
    the profile row so future lookups can use the stable discord_id and avatars appear in
    the app. These syncs are best-effort — if the columns don't exist yet they fail silently
    so existing deployments are never broken.
    """
    token = credentials.credentials

    try:
        payload = _decode_token(token, settings.supabase_jwt_secret)
        meta = payload.get("user_metadata") or {}
        discord_display_name = meta.get("full_name") or meta.get("name")

        if not discord_display_name:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authenticatie mislukt.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        discord_id       = meta.get("provider_id")
        discord_avatar   = meta.get("avatar_url") or meta.get("picture")
        discord_username = meta.get("preferred_username") or meta.get("name")

        # All name fields Discord may populate (tried in order)
        discord_names = list(dict.fromkeys(filter(None, [
            meta.get("full_name"),
            meta.get("name"),
            meta.get("preferred_username"),
        ])))

        profile_name: str | None = None

        # ── 1 & 2. Profile lookup with one retry on transient DB failure ──────
        _select = "name, is_active, is_first_login, allow_dm"
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
                        print("[AUTH] found by discord_id")
                    else:
                        print("[AUTH] discord_id lookup returned no rows")
                except Exception as e:
                    print(f"[AUTH] discord_id lookup failed: {e}")
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
                        print(f"[AUTH] name lookup failed: {e}")
                        _db_error = True
                        break

            if profile_name is not None:
                break

            if _attempt == 0:
                if _db_error:
                    print("[AUTH] DB error on first attempt, retrying after 300ms")
                else:
                    print("[AUTH] profile not found on first attempt, retrying after 300ms")
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
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Toegang geweigerd. Neem contact op met een beheerder.",
                )
            try:
                wl = supabase.table("whitelist").select("discord_id").eq("discord_id", discord_id).execute()
            except Exception as e:
                print(f"[AUTH] whitelist check failed: {e}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Toegang geweigerd. Neem contact op met een beheerder.",
                )
            if not wl.data:
                print(f"[AUTH] discord_id {discord_id} not in whitelist")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Toegang geweigerd. Neem contact op met een beheerder.",
                )
            try:
                new_name = (
                    discord_username
                    or discord_display_name
                    or f"user_{user.id[:8]}"
                )
                insert_data: dict = {
                    "id": user.id,
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
                    print(f"[AUTH] auto-created profile for {new_name}")
                else:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Profiel aanmaken mislukt.",
                    )
            except HTTPException:
                raise
            except Exception as e:
                print(f"[AUTH] auto-create profile failed: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Profiel aanmaken mislukt.",
                )

        # ── 2b. Check if account is active ───────────────────────────────────
        if profile_row and profile_row.get("is_active") is False:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Je account is gedeactiveerd. Neem contact op met een beheerder.",
            )

        # ── 2c. First login — send welcome DM once ───────────────────────────
        if profile_row and profile_row.get("is_first_login") and discord_id:
            try:
                supabase.table("profiles").update({"is_first_login": False}).eq("name", profile_name).execute()
                if profile_row.get("allow_dm", True):
                    discord_bot.send_welcome_dm(settings.discord_bot_token, discord_id, profile_name)
            except Exception as e:
                print(f"[AUTH] first-login DM failed: {e}")

        # ── 3. Best-effort: backfill discord_id + avatar_url ─────────────────
        try:
            sync: dict = {}
            if discord_id:
                sync["discord_id"] = discord_id
            if discord_avatar:
                sync["avatar_url"] = discord_avatar
            if discord_username:
                sync["discord_username"] = discord_username
            if sync:
                supabase.table("profiles").update(sync).eq("name", profile_name).execute()
        except Exception:
            pass  # columns don't exist yet — non-fatal

        return profile_name

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticatie mislukt.",
            headers={"WWW-Authenticate": "Bearer"},
        )


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
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Toegang geweigerd. Alleen admins hebben toegang tot dit gedeelte.",
        )
    return current_user
