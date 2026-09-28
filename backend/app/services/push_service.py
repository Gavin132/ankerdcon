"""
Web push — a second notification channel next to the Discord DMs in
notification_service.py, for members who don't check Discord, or who signed
up with Google and have no Discord DM channel at all.

Fire-and-forget throughout, like discord_bot.py: a missing VAPID key, an
unreachable push service or a dead subscription must never break the caller.
A subscription that comes back 404/410 (uninstalled, cleared site data,
revoked permission) is deleted here — the one place that finds out.
"""

from __future__ import annotations

import json

from pywebpush import WebPushException, webpush

from app.config import Settings
from app.constants import Tables
from app.core.database import supabase
from app.core.logging import get_logger

logger = get_logger(__name__)

# Batched sends: this many `.in_("user_name", ...)` at a time, so a broadcast
# to everyone doesn't build one arbitrarily long query.
_BATCH = 200


def _send_one(settings: Settings, sub: dict, payload: str) -> None:
    try:
        webpush(
            subscription_info={
                "endpoint": sub["endpoint"],
                "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]},
            },
            data=payload,
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_subject},
            ttl=60 * 60 * 24,  # a day — long enough for a phone that was off, not stale after
        )
    except WebPushException as e:
        status_code = e.status_code
        if status_code in (404, 410):
            try:
                supabase.table(Tables.PUSH_SUBSCRIPTIONS).delete().eq("id", sub["id"]).execute()
            except Exception:
                pass  # picked up again next time it 404s — non-fatal
        else:
            logger.warning("Push send failed (%s): %s", status_code, e)
    except Exception as e:
        logger.warning("Push send failed: %s", e)


def send_push(settings: Settings, user_names: list[str], title: str, body: str, url: str = "/") -> None:
    """Push `title`/`body` to every subscribed device of these members.
    Silently does nothing when push isn't configured (no VAPID key) or the
    list is empty — never an error for the caller."""
    if not settings.vapid_private_key or not user_names:
        return
    try:
        subs = (
            supabase.table(Tables.PUSH_SUBSCRIPTIONS)
            .select("id, endpoint, p256dh, auth")
            .in_("user_name", user_names[:_BATCH])
            .execute()
            .data
            or []
        )
    except Exception as e:
        logger.error("Push: failed to fetch subscriptions: %s", e)
        return
    if not subs:
        return

    payload = json.dumps({"title": title, "body": body, "url": url})
    for sub in subs:
        _send_one(settings, sub, payload)


def headline(dm_content: str) -> str:
    """The DM templates in app/messages.py are Discord markdown, meant for a chat
    bubble; a push notification is one short plain line. Takes the first line,
    strips the ** bold markers (the only markdown these templates use) and
    trims it to a sane notification length."""
    first_line = dm_content.strip().split("\n", 1)[0]
    plain = first_line.replace("**", "")
    return plain if len(plain) <= 120 else plain[:117] + "…"
