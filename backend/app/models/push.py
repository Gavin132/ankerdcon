from __future__ import annotations

from pydantic import BaseModel


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionRequest(BaseModel):
    """The exact shape `PushSubscription.toJSON()` gives in the browser —
    passed straight through from `pushManager.subscribe()`."""
    endpoint: str
    keys: PushKeys


class UnsubscribeRequest(BaseModel):
    endpoint: str
