from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, field_validator

FeedbackKind = Literal["bug", "idea", "other"]
FeedbackStatus = Literal["new", "seen", "done"]

MESSAGE_MIN = 5
MESSAGE_MAX = 2000


class Feedback(BaseModel):
    id: str
    kind: FeedbackKind
    message: str
    # None when the member chose to send it anonymously.
    user_name: Optional[str] = None
    app_version: Optional[str] = None
    status: FeedbackStatus = "new"
    created_at: Optional[datetime] = None


class CreateFeedbackRequest(BaseModel):
    kind: FeedbackKind
    message: str
    anonymous: bool = False
    app_version: Optional[str] = None

    @field_validator("message")
    @classmethod
    def _message_length(cls, v: str) -> str:
        v = v.strip()
        if len(v) < MESSAGE_MIN:
            raise ValueError(f"Schrijf minstens {MESSAGE_MIN} tekens.")
        if len(v) > MESSAGE_MAX:
            raise ValueError(f"Maximaal {MESSAGE_MAX} tekens.")
        return v

    @field_validator("app_version")
    @classmethod
    def _version_length(cls, v: Optional[str]) -> Optional[str]:
        return v[:20] if v else None


class UpdateFeedbackRequest(BaseModel):
    status: FeedbackStatus
