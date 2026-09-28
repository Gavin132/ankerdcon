import time

from fastapi import APIRouter, Depends, HTTPException, status

from app.constants import Tables
from app.core.database import supabase
from app.core.logging import get_logger
from app.dependencies import get_current_user
from app.models.feedback import CreateFeedbackRequest
from app.routes import FeedbackRoutes

logger = get_logger(__name__)
router = APIRouter(prefix=FeedbackRoutes.PREFIX, tags=["feedback"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."

# In memory, per process, like the API rate limit: enough to stop one member
# flooding the table. Kept by who is sending, so an anonymous message still
# counts against its sender without the row ever naming them.
_MAX_PER_HOUR = 5
_WINDOW_SECONDS = 3600
_sent: dict[str, list[float]] = {}


def _within_limit(user: str) -> bool:
    now = time.monotonic()
    recent = [t for t in _sent.get(user, []) if now - t < _WINDOW_SECONDS]
    if len(recent) >= _MAX_PER_HOUR:
        _sent[user] = recent
        return False
    recent.append(now)
    _sent[user] = recent
    return True


@router.post(FeedbackRoutes.LIST, status_code=status.HTTP_201_CREATED)
def submit_feedback(body: CreateFeedbackRequest, current_user: str = Depends(get_current_user)) -> dict:
    """A bug, idea or remark from a member, saved for the admins. Anonymous
    means the row carries no name at all."""
    if not _within_limit(current_user):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Je hebt net al meerdere berichten gestuurd. Probeer het over een uur opnieuw.",
        )
    try:
        supabase.table(Tables.FEEDBACK).insert({
            "kind": body.kind,
            "message": body.message,
            "user_name": None if body.anonymous else current_user,
            "app_version": body.app_version,
        }).execute()
    except Exception as e:
        logger.error("Failed to save feedback: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    return {"ok": True}
