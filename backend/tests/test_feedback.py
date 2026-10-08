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
    _submit(CreateFeedbackRequest(kind="bug", message="  De kaart laadt niet  ", app_version="2.0.2"), "Sam")
    assert rows == [{"kind": "bug", "message": "De kaart laadt niet", "user_name": "Sam", "app_version": "2.0.2"}]


def test_an_anonymous_message_carries_no_name(rows):
    _submit(CreateFeedbackRequest(kind="idea", message="Meer badges graag", anonymous=True), "Sam")
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
        _submit(body, "Sam")
    with pytest.raises(HTTPException) as e:
        _submit(body, "Sam")
    assert e.value.status_code == 429
    _submit(body, "Alex")  # someone else is not affected
    assert len(rows) == 6


# ── telling the admins ───────────────────────────────────────────────────────

class _Tasks:
    def __init__(self):
        self.added = []

    def add_task(self, fn, *args):
        self.added.append((fn, args))


def _submit(body, user="Sam"):
    from types import SimpleNamespace

    tasks = _Tasks()
    feedback.submit_feedback(body, tasks, user, SimpleNamespace(discord_bot_token="tok"))
    return tasks.added


def test_submitting_feedback_notifies_admins(rows):
    added = _submit(CreateFeedbackRequest(kind="bug", message="De kaart laadt niet"))
    assert len(added) == 1
    fn, (token, category, content) = added[0]
    assert category == "feedback_submitted" and token == "tok"
    assert "De kaart laadt niet" in content and "bug" in content and "van Sam" in content


def test_an_anonymous_notification_names_nobody(rows):
    (_, (_, _, content)), = _submit(CreateFeedbackRequest(kind="idea", message="Meer badges graag", anonymous=True))
    assert "Sam" not in content and " van " not in content


def test_a_long_message_is_shortened_in_the_notification(rows):
    (_, (_, _, content)), = _submit(CreateFeedbackRequest(kind="other", message="x" * 1500))
    assert len(content) < 500 and "…" in content
