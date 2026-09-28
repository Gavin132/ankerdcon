"""Member feedback: saved with or without a name, validated, and rate limited."""
import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.models.feedback import CreateFeedbackRequest
from app.routers import feedback


class _Table:
    def __init__(self, sink: list):
        self.sink = sink

    def insert(self, row):
        self.sink.append(row)
        return self

    def execute(self):
        return self


@pytest.fixture(autouse=True)
def rows(monkeypatch):
    saved: list = []
    monkeypatch.setattr(feedback.supabase, "table", lambda name: _Table(saved))
    feedback._sent.clear()
    return saved


def test_a_named_message_carries_the_name(rows):
    feedback.submit_feedback(CreateFeedbackRequest(kind="bug", message="  De kaart laadt niet  ", app_version="2.0.2"), "Sam")
    assert rows == [{"kind": "bug", "message": "De kaart laadt niet", "user_name": "Sam", "app_version": "2.0.2"}]


def test_an_anonymous_message_carries_no_name(rows):
    feedback.submit_feedback(CreateFeedbackRequest(kind="idea", message="Meer badges graag", anonymous=True), "Sam")
    assert rows[0]["user_name"] is None
    assert "Sam" not in str(rows[0])


@pytest.mark.parametrize("message", ["", "abc", "x" * 2001])
def test_too_short_or_too_long_is_refused(message):
    with pytest.raises(ValidationError):
        CreateFeedbackRequest(kind="other", message=message)


def test_an_unknown_kind_is_refused():
    with pytest.raises(ValidationError):
        CreateFeedbackRequest(kind="spam", message="Hallo daar")


def test_the_sixth_message_within_the_hour_is_refused(rows):
    body = CreateFeedbackRequest(kind="other", message="Nog iets", anonymous=True)
    for _ in range(5):
        feedback.submit_feedback(body, "Sam")
    with pytest.raises(HTTPException) as e:
        feedback.submit_feedback(body, "Sam")
    assert e.value.status_code == 429
    feedback.submit_feedback(body, "Alex")  # someone else is not affected
    assert len(rows) == 6
