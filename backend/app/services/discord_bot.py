"""
Ankerd Con — Discord bot DM service.

Sends private messages to individual users via a Discord bot token.
All functions are synchronous, fire-and-forget, and never raise —
a missing token or failed DM must never break the main API flow.

Adding a new DM type:
  1. Add the message text to app/messages.py.
  2. Write a send_* function here using _send_dm().
  3. Call it from the appropriate router or dependency.
"""

from __future__ import annotations

import httpx

from app import messages

_DISCORD_API = "https://discord.com/api/v10"
_TIMEOUT = 5.0


def _headers(bot_token: str) -> dict[str, str]:
    return {"Authorization": f"Bot {bot_token}"}


def _open_dm_channel(bot_token: str, discord_id: str) -> str | None:
    """Open (or retrieve) the DM channel with a user. Returns channel_id or None."""
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            r = client.post(
                f"{_DISCORD_API}/users/@me/channels",
                headers=_headers(bot_token),
                json={"recipient_id": discord_id},
            )
            if r.status_code == 200:
                return r.json()["id"]
            print(f"[discord_bot] open_dm failed ({r.status_code}): {r.text}")
    except Exception as e:
        print(f"[discord_bot] open_dm error: {e}")
    return None


def _send_dm(bot_token: str, discord_id: str, content: str) -> None:
    """Core: open DM channel then post content. Silently swallows all errors."""
    if not bot_token or not discord_id:
        return
    try:
        channel_id = _open_dm_channel(bot_token, discord_id)
        if not channel_id:
            return
        with httpx.Client(timeout=_TIMEOUT) as client:
            r = client.post(
                f"{_DISCORD_API}/channels/{channel_id}/messages",
                headers=_headers(bot_token),
                json={"content": content},
            )
            if r.status_code not in (200, 201):
                print(f"[discord_bot] send_message failed ({r.status_code}): {r.text}")
    except Exception as e:
        print(f"[discord_bot] send_dm error: {e}")


# ── Public send functions ──────────────────────────────────────────────────────

def send_welcome_dm(bot_token: str, discord_id: str, name: str) -> None:
    """Sent once on the user's first login after being whitelisted."""
    _send_dm(bot_token, discord_id, messages.DM_WELCOME.format(name=name))


def send_deactivated_dm(bot_token: str, discord_id: str) -> None:
    """Sent when an admin deactivates a user account."""
    _send_dm(bot_token, discord_id, messages.DM_DEACTIVATED)


def send_removed_dm(bot_token: str, discord_id: str) -> None:
    """Sent when an admin permanently deletes a user account."""
    _send_dm(bot_token, discord_id, messages.DM_REMOVED)
