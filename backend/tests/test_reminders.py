"""The scheduled reminders, run against canned rows. A regression test: the daily job
used to crash on every event (`.date()` on a plain date), so nothing was ever sent."""
import asyncio
from datetime import date, datetime, timedelta, timezone

import pytest

from app.services import reminder_scheduler as rs


class _Result:
    def __init__(self, data):
        self.data = data


class FakeDb:
    def __init__(self, events, days):
        self.tables = {"events": events, "event_days": days}
        self.updates = []

    def table(self, name):
        return _Query(self, name)


class _Query:
    def __init__(self, db, name):
        self.db, self.name, self.payload = db, name, None

    def select(self, *_):
        return self

    def update(self, payload):
        self.payload = payload
        return self

    def eq(self, *_):
        return self

    def execute(self):
        if self.payload is not None:
            self.db.updates.append((self.name, self.payload))
            return _Result([])
        return _Result(self.tables_rows())

    def tables_rows(self):
        return self.db.tables[self.name]


@pytest.fixture
def sent(monkeypatch):
    sent = []
    monkeypatch.setattr(rs.notification_service, "broadcast_category_dm", lambda token, cat, msg: sent.append((cat, msg)))
    monkeypatch.setattr(rs, "get_settings", lambda: type("S", (), {"discord_bot_token": "t"})())
    return sent


def _run(monkeypatch, today, days, reminders_sent=None):
    db = FakeDb(
        [{"id": "e1", "event_name": "Con", "location": "Utrecht", "reminders_sent": reminders_sent or []}],
        days,
    )
    monkeypatch.setattr(rs, "supabase", db)
    monkeypatch.setattr(rs, "_local_now", lambda: datetime(today.year, today.month, today.day, 8, 0))
    asyncio.run(rs.check_and_send_reminders())
    return db


def test_a_week_before_sends_one_reminder_and_marks_it(monkeypatch, sent):
    db = _run(monkeypatch, date(2026, 9, 18), [{"event_id": "e1", "date": "2026-09-25", "has_con": True}])
    assert len(sent) == 1
    assert db.updates == [("events", {"reminders_sent": ["7d"]})]


def test_anchors_to_the_first_con_day_not_a_hotel_only_day(monkeypatch, sent):
    days = [
        {"event_id": "e1", "date": "2026-09-24", "has_con": False},
        {"event_id": "e1", "date": "2026-09-25", "has_con": True},
    ]
    _run(monkeypatch, date(2026, 9, 24), days)  # the day before the first con day
    assert len(sent) == 1


def test_a_reminder_already_sent_is_not_sent_again(monkeypatch, sent):
    _run(monkeypatch, date(2026, 9, 18), [{"event_id": "e1", "date": "2026-09-25", "has_con": True}], ["7d"])
    assert sent == []


def test_dutch_dates_are_read_too(monkeypatch, sent):
    _run(monkeypatch, date(2026, 9, 18), [{"event_id": "e1", "date": "25-09-2026", "has_con": True}])
    assert len(sent) == 1


def test_no_reminder_on_an_ordinary_day(monkeypatch, sent):
    _run(monkeypatch, date(2026, 9, 10), [{"event_id": "e1", "date": "2026-09-25", "has_con": True}])
    assert sent == []


def test_now_is_dutch_time_not_the_servers():
    # Naive (comparable to the naive dates in the database) and within a day of UTC.
    now = rs._local_now()
    assert now.tzinfo is None
    assert abs((now - datetime.now(timezone.utc).replace(tzinfo=None)).total_seconds()) < 3 * 3600


def _tickets(monkeypatch, sale_at, now, sent_before=None):
    db = FakeDb([{"id": "e1", "event_name": "Con", "ticket_sale_start": sale_at, "ticket_url": None,
                  "ticket_reminders_sent": sent_before or []}], [])
    monkeypatch.setattr(rs, "supabase", db)
    monkeypatch.setattr(rs, "_local_now", lambda: now)
    asyncio.run(rs.check_and_send_ticket_reminders())
    return db


def test_ticket_sale_that_just_opened_is_announced(monkeypatch, sent):
    db = _tickets(monkeypatch, "2026-09-26T10:00:00", datetime(2026, 9, 26, 10, 5))
    assert len(sent) == 1
    assert db.updates == [("events", {"ticket_reminders_sent": ["open"]})]


def test_a_sale_from_long_ago_is_marked_but_not_announced(monkeypatch, sent):
    db = _tickets(monkeypatch, "2026-06-01T10:00:00", datetime(2026, 9, 26, 10, 5))
    assert sent == []
    assert db.updates == [("events", {"ticket_reminders_sent": ["24h", "open"]})]


def test_ticket_times_with_an_offset_are_read_as_dutch_time(monkeypatch, sent):
    # 08:00 UTC is 10:00 in Amsterdam in summer, so at 10:05 local it has just opened.
    _tickets(monkeypatch, "2026-09-26T08:00:00+00:00", datetime(2026, 9, 26, 10, 5))
    assert len(sent) == 1
