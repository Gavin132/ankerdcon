from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

AnnouncementSeverity = Literal["info", "warning", "urgent"]


class Announcement(BaseModel):
    id: str
    message: str
    severity: AnnouncementSeverity = "info"
    active: bool = True
    dismissible: bool = True
    notify_discord: bool = False
    created_at: Optional[datetime] = None
    created_by: Optional[str] = None


class CreateAnnouncementRequest(BaseModel):
    message: str
    severity: AnnouncementSeverity = "info"
    dismissible: bool = True
    notify_discord: bool = False


class UpdateAnnouncementRequest(BaseModel):
    message: Optional[str] = None
    severity: Optional[AnnouncementSeverity] = None
    active: Optional[bool] = None
    dismissible: Optional[bool] = None
    notify_discord: Optional[bool] = None
