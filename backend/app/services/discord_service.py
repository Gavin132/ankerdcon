"""Async Discord webhook notifications — fire-and-forget, never blocks a request."""

from __future__ import annotations

from datetime import datetime, timezone

import httpx

# Ankerd brand sky-blue as Discord embed colour
_EMBED_COLOR = 0x38BDF8


async def send_notification(
    webhook_url: str,
    app_url: str,
    title: str,
    message: str,
) -> None:
    """POST an embed to the Discord webhook. Silently ignores errors."""
    if not webhook_url:
        return

    body = message
    if app_url:
        body += f"\n\n[👉 **Open the App**]({app_url})"

    payload = {
        "username": "Ankerd Con Bot",
        "embeds": [
            {
                "title": title,
                "description": body,
                "color": _EMBED_COLOR,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ],
    }

    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            await client.post(webhook_url, json=payload)
        except httpx.RequestError:
            pass  # Notification failure must never break the main request
