from fastapi import APIRouter, Depends, HTTPException, status

from app.constants import Tables
from app.core.database import supabase
from app.core.logging import get_logger
from app.dependencies import get_current_user
from app.models.push import PushSubscriptionRequest, UnsubscribeRequest
from app.routes import PushRoutes

logger = get_logger(__name__)
router = APIRouter(prefix=PushRoutes.PREFIX, tags=["push"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."


@router.post(PushRoutes.SUBSCRIBE, status_code=status.HTTP_204_NO_CONTENT)
def subscribe(body: PushSubscriptionRequest, current_user: str = Depends(get_current_user)) -> None:
    """Save (or refresh) this device's push subscription. Upserted on
    `endpoint`, the push service's own per-device identifier, so subscribing
    twice from the same browser updates the same row instead of duplicating
    it — and correctly moves the row to whoever is signed in now if it was
    someone else's device before."""
    try:
        supabase.table(Tables.PUSH_SUBSCRIPTIONS).upsert({
            "user_name": current_user,
            "endpoint": body.endpoint,
            "p256dh": body.keys.p256dh,
            "auth": body.keys.auth,
        }, on_conflict="endpoint").execute()
    except Exception as e:
        logger.error("Push subscribe failed for %s: %s", current_user, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.delete(PushRoutes.SUBSCRIBE, status_code=status.HTTP_204_NO_CONTENT)
def unsubscribe(body: UnsubscribeRequest, _: str = Depends(get_current_user)) -> None:
    """Remove a subscription by its endpoint — no ownership check: an
    endpoint is a device-specific secret nobody else could plausibly send,
    and the app always calls this for its own current subscription."""
    try:
        supabase.table(Tables.PUSH_SUBSCRIPTIONS).delete().eq("endpoint", body.endpoint).execute()
    except Exception as e:
        logger.error("Push unsubscribe failed: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
