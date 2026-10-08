from __future__ import annotations

import httpx
from supabase import Client, create_client

from app.config import get_settings
from app.core.http_retry import RetryOnceTransport
from app.core.logging import get_logger

logger = get_logger(__name__)

# The library's defaults are a 120 second timeout on every database call, over one
# HTTP/2 connection that every request in the app shares. When that one connection
# dies quietly (a proxy or NAT drops it without telling anyone), every call made on
# it hangs for up to two minutes: the whole site crawls, a refresh does not help, and
# it comes back by itself. A healthy query answers in well under a second, so fail
# fast instead and let the next attempt open a fresh connection.
_TIMEOUT = httpx.Timeout(connect=5.0, read=20.0, write=10.0, pool=10.0)
# Idle connections are dropped well before a proxy would drop them for us.
_LIMITS = httpx.Limits(max_connections=50, max_keepalive_connections=20, keepalive_expiry=4.0)


def _tune_database_client(client: Client) -> None:
    """Gives the database client its own HTTP/1.1 connections, with real timeouts.

    With HTTP/1.1 each concurrent request has its own connection, so one dead
    connection costs one request instead of all of them. Done by swapping the
    session the client already built (same address and headers), because the
    library offers no setting for it that is safe to use alongside its auth client.
    Never fatal: if the library changes shape, the default client keeps working.
    """
    try:
        postgrest = client.postgrest
        old = postgrest.session
        postgrest.session = httpx.Client(
            base_url=old.base_url,
            headers=old.headers,
            timeout=_TIMEOUT,
            follow_redirects=True,
            http2=False,
            transport=RetryOnceTransport(httpx.HTTPTransport(retries=2, http2=False, limits=_LIMITS)),
        )
        old.close()
    except Exception as e:  # pragma: no cover - only if supabase-py changes internally
        logger.warning("Could not tune the database connection, using the library defaults: %s", e)


def _create_client() -> Client:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_secret_key:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env"
        )
    client = create_client(settings.supabase_url, settings.supabase_secret_key)
    _tune_database_client(client)
    return client


supabase: Client = _create_client()
