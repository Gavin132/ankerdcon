"""FastAPI dependency providers shared across routers."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import supabase

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
                detail="User account not found in auth provider",
            )

        meta = user.user_metadata or {}
        discord_display_name = meta.get("full_name") or meta.get("name")

        if not discord_display_name:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not resolve name from auth provider metadata",
            )

        discord_id = meta.get("provider_id")
        discord_avatar = meta.get("avatar_url") or meta.get("picture")
        discord_username = meta.get("preferred_username") or meta.get("name")
        # All name fields Discord may populate (tried in order)
        discord_names = list(dict.fromkeys(filter(None, [
            meta.get("full_name"),
            meta.get("name"),
            meta.get("preferred_username"),
        ])))


        profile_name: str | None = None

        # ── 1. Stable lookup by discord_id (works even after a name change) ──
        if discord_id:
            try:
                resp = supabase.table("profiles").select("name").eq("discord_id", discord_id).execute()
                if resp.data:
                    profile_name = resp.data[0]["name"]
                    print(f"[AUTH] found by discord_id → {profile_name!r}")
                else:
                    print(f"[AUTH] discord_id lookup returned no rows (column missing or value not set)")
            except Exception as e:
                print(f"[AUTH] discord_id lookup failed: {e}")
                pass

        # ── 2. Fall back to Discord display name (first-time / pre-migration) ─
        if profile_name is None:
            for candidate in discord_names:
                resp = supabase.table("profiles").select("name").eq("name", candidate).execute()
                if resp.data:
                    profile_name = resp.data[0]["name"]
                    break

        if profile_name is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Toegang geweigerd. Discord-ID '{discord_id}' en naam(en) {discord_names} "
                    "zijn niet gevonden in de profiellijst. Neem contact op met een beheerder."
                ),
            )

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
    except AuthApiError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {e.message}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
