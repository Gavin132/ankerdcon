"""FastAPI dependency providers shared across routers."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import supabase
from app.services import discord_bot

try:
    from gotrue.errors import AuthApiError
except ImportError:
    AuthApiError = Exception  # type: ignore[misc,assignment]

_bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    """Validate the Supabase JWT, enforce the allowlist, and return the user's display name.

    After the allowlist check passes, attempts to backfill discord_id + avatar_url into
    the profile row so future lookups can use the stable discord_id and avatars appear in
    the app. These syncs are best-effort — if the columns don't exist yet they fail silently
    so existing deployments are never broken.
    """
    token = credentials.credentials

    try:
        auth_response = supabase.auth.get_user(token)
        user = auth_response.user

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authenticatie mislukt.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        meta = user.user_metadata or {}
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

        # ── 1. Stable lookup by discord_id (works even after a name change) ──
        profile_row: dict | None = None
        _select = "name, is_active, is_first_login, allow_dm"
        if discord_id:
            try:
                resp = supabase.table("profiles").select(_select).eq("discord_id", discord_id).execute()
                if resp.data:
                    profile_row = resp.data[0]
                    profile_name = profile_row["name"]
                    print(f"[AUTH] found by discord_id")
                else:
                    print("[AUTH] discord_id lookup returned no rows")
            except Exception as e:
                print(f"[AUTH] discord_id lookup failed: {e}")

        # ── 2. Fall back to Discord display name (first-time / pre-migration) ─
        if profile_name is None:
            for candidate in discord_names:
                resp = supabase.table("profiles").select(_select).eq("name", candidate).execute()
                if resp.data:
                    profile_row = resp.data[0]
                    profile_name = profile_row["name"]
                    break

        if profile_name is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Toegang geweigerd. Neem contact op met een beheerder.",
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
                    from app.config import get_settings
                    settings = get_settings()
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
    except AuthApiError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ongeldige of verlopen sessie. Log opnieuw in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
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
