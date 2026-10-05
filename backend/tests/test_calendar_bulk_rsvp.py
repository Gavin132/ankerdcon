"""rsvp_event_bulk / leave_event_bulk: the glue between act_for_anyone_bulk and
update_list — the dedup logic each endpoint's `change` closure applies to the
day's participants list. update_list's own read/write/retry machinery is
tested in test_atomic.py; this only checks what these two endpoints do with it."""
import pytest

from app.models.calendar import CalendarBulkRsvpRequest
from app.routers import calendar

EVENT_ID = "22222222-2222-2222-2222-222222222222"


@pytest.fixture
def captured(monkeypatch):
    """Replaces update_list with something that just runs `change` against a
    fixed starting list and returns the result, so each test can assert on
    exactly the list the endpoint decided to write."""
    calls = {}

    def fake_update_list(table, row_id, column, change, **kwargs):
        calls["result"] = change(list(calls["start"]), {column: calls["start"]})
        return {}, calls["result"]

    monkeypatch.setattr(calendar, "update_list", fake_update_list)
    monkeypatch.setattr(calendar, "act_for_anyone_bulk", lambda _user, names, **kw: names)
    return calls


def test_rsvp_bulk_adds_only_the_new_names(captured):
    captured["start"] = ["Alex"]
    calendar.rsvp_event_bulk(EVENT_ID, CalendarBulkRsvpRequest(user_names=["Alex", "Robin", "Sam"]), "Sam")
    assert captured["result"] == ["Alex", "Robin", "Sam"]


def test_rsvp_bulk_is_a_noop_when_everyone_is_already_on(captured):
    captured["start"] = ["Alex", "Robin"]
    calendar.rsvp_event_bulk(EVENT_ID, CalendarBulkRsvpRequest(user_names=["Alex", "Robin"]), "Sam")
    assert captured["result"] is None


def test_leave_bulk_removes_only_the_named_people(captured):
    captured["start"] = ["Alex", "Robin", "Sam"]
    calendar.leave_event_bulk(EVENT_ID, CalendarBulkRsvpRequest(user_names=["Robin", "Sam"]), "Sam")
    assert captured["result"] == ["Alex"]


def test_leave_bulk_is_a_noop_when_nobody_named_is_on_it(captured):
    captured["start"] = ["Alex"]
    calendar.leave_event_bulk(EVENT_ID, CalendarBulkRsvpRequest(user_names=["Robin"]), "Sam")
    assert captured["result"] is None
