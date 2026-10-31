"""The member's own settings: quiet hours for category notifications, unlinking Discord, and the data export."""
import json
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.models.user import UpdatePreferencesRequest
from app.routers import users as users_router
from app.services import discord_bot, member_export, notification_service as svc, push_service


# ── quiet hours ──────────────────────────────────────────────────────────────

class TestInQuietHours:
    def test_a_window_within_a_day(self):
        assert svc.in_quiet_hours(13, 15, 13) and svc.in_quiet_hours(13, 15, 14)
        assert not svc.in_quiet_hours(13, 15, 15) and not svc.in_quiet_hours(13, 15, 12)

    def test_a_window_that_crosses_midnight(self):
        assert svc.in_quiet_hours(23, 8, 23) and svc.in_quiet_hours(23, 8, 0) and svc.in_quiet_hours(23, 8, 7)
        assert not svc.in_quiet_hours(23, 8, 8) and not svc.in_quiet_hours(23, 8, 12) and not svc.in_quiet_hours(23, 8, 22)

    def test_without_both_hours_there_are_none(self):
        assert not svc.in_quiet_hours(None, None, 3)
        assert not svc.in_quiet_hours(23, None, 23)
        assert not svc.in_quiet_hours(5, 5, 5)


def _profile(name, **extra):
    return {"name": name, "discord_id": f"id-{name}", "notification_categories": ["ride_created"], "is_active": True,
            "allow_dm": True, "is_admin": False, **extra}


@pytest.fixture
def sent(monkeypatch):
    out = {"dm": [], "push": []}
    monkeypatch.setattr(svc, "get_settings", lambda: SimpleNamespace())
    monkeypatch.setattr(discord_bot, "send_dm", lambda token, discord_id, content: out["dm"].append(discord_id))
    monkeypatch.setattr(push_service, "send_push", lambda settings, names, *a: out["push"].extend(names))
    return out


def test_a_broadcast_skips_members_in_their_quiet_hours(monkeypatch, sent):
    monkeypatch.setattr(svc, "_local_hour", lambda: 2)
    monkeypatch.setattr(svc, "_fetch_profiles", lambda category: [
        _profile("Sleeping", quiet_hours_start=23, quiet_hours_end=8),
        _profile("Awake", quiet_hours_start=9, quiet_hours_end=12),
        _profile("Plain"),
    ])
    svc.broadcast_category_dm("tok", "ride_created", "hi")
    assert sent["dm"] == ["id-Awake", "id-Plain"]
    assert sent["push"] == ["Awake", "Plain"]


def test_the_quiet_hours_end_when_the_window_does(monkeypatch, sent):
    monkeypatch.setattr(svc, "_local_hour", lambda: 8)
    monkeypatch.setattr(svc, "_fetch_profiles", lambda category: [_profile("Sam", quiet_hours_start=23, quiet_hours_end=8)])
    svc.broadcast_category_dm("tok", "ride_created", "hi")
    assert sent["push"] == ["Sam"]


class TestPreferencesRequest:
    def test_a_window_needs_both_hours(self):
        with pytest.raises(ValidationError):
            UpdatePreferencesRequest(quiet_hours_start=23)

    def test_an_empty_window_is_refused(self):
        with pytest.raises(ValidationError):
            UpdatePreferencesRequest(quiet_hours_start=8, quiet_hours_end=8)

    def test_an_hour_must_be_an_hour(self):
        with pytest.raises(ValidationError):
            UpdatePreferencesRequest(quiet_hours_start=24, quiet_hours_end=8)

    def test_off_needs_no_hours_and_a_window_is_fine(self):
        assert UpdatePreferencesRequest(quiet_hours_off=True).quiet_hours_off
        assert UpdatePreferencesRequest(quiet_hours_start=23, quiet_hours_end=8).quiet_hours_end == 8


class _Result:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self, db, name):
        self.db, self.name, self.op, self.payload, self.conds = db, name, "select", None, []

    def select(self, *_):
        return self

    def eq(self, col, val):
        self.conds.append((col, val))
        return self

    def update(self, payload):
        self.op, self.payload = "update", payload
        return self

    def execute(self):
        rows = [r for r in self.db.tables.get(self.name, []) if all(r.get(c) == v for c, v in self.conds)]
        if self.op == "update":
            self.db.updates.append((self.name, self.payload, self.conds))
            if self.db.fail_update:
                raise RuntimeError(self.db.fail_update)
            for r in rows:
                r.update(self.payload)
        return _Result(rows)


class FakeDb:
    def __init__(self, tables, identities=(), fail_update=None):
        self.tables, self.updates, self.fail_update = tables, [], fail_update
        user = SimpleNamespace(identities=[SimpleNamespace(provider=p) for p in identities])
        self.auth = SimpleNamespace(admin=SimpleNamespace(get_user_by_id=lambda _id: SimpleNamespace(user=user)))

    def table(self, name):
        return _Query(self, name)


# ── unlinking Discord ────────────────────────────────────────────────────────

def _linked():
    return {"profiles": [{"id": "u1", "name": "Sam", "discord_id": "d1", "discord_username": "sam"}]}


def test_unlinking_clears_the_profile_once_the_login_no_longer_has_discord(monkeypatch):
    db = FakeDb(_linked(), identities=["google"])
    monkeypatch.setattr(users_router, "supabase", db)
    users_router.unlink_discord("Sam")
    assert db.tables["profiles"][0]["discord_id"] is None and db.tables["profiles"][0]["discord_username"] is None


def test_unlinking_is_refused_while_the_login_still_has_discord(monkeypatch):
    db = FakeDb(_linked(), identities=["google", "discord"])
    monkeypatch.setattr(users_router, "supabase", db)
    with pytest.raises(HTTPException) as err:
        users_router.unlink_discord("Sam")
    assert err.value.status_code == 409 and db.updates == []


def test_unlinking_without_a_linked_account_says_so(monkeypatch):
    db = FakeDb({"profiles": [{"id": "u1", "name": "Sam", "discord_id": None}]}, identities=["google"])
    monkeypatch.setattr(users_router, "supabase", db)
    with pytest.raises(HTTPException) as err:
        users_router.unlink_discord("Sam")
    assert err.value.status_code == 400


# ── the export ───────────────────────────────────────────────────────────────

def _export_db():
    return FakeDb({
        "events": [{"id": "e1", "event_name": "Dokomi"}],
        "event_days": [
            {"id": "d1", "event_id": "e1", "date": "2027-05-21", "participants": ["Sam", "Pip"]},
            {"id": "d2", "event_id": "e1", "date": "2027-05-22", "participants": ["Pip"]},
        ],
        "rides": [
            {"id": "r1", "driver": "Sam", "passengers": [], "direction": "Outbound", "departure_time": "t", "start_location": "A", "end_location": "B"},
            {"id": "r2", "driver": "Pip", "passengers": ["Samdraws"], "direction": "Inbound", "departure_time": "t", "start_location": "B", "end_location": "A"},
            {"id": "r3", "driver": "Pip", "passengers": ["Zoe"], "direction": "Inbound", "departure_time": "t", "start_location": "B", "end_location": "A"},
        ],
        "meals": [{"id": "m1", "participants": ["Pip"], "created_by": "Pip", "meal_name": "Pizza"}],
        "expenses": [{"id": "x1", "paid_by": "Sam", "description": "Hotel", "amount": 90, "created_at": "t"}],
        "expense_shares": [{"id": "s1", "participant": "Samdraws", "amount": 30, "status": "pending"}, {"id": "s2", "participant": "Pip", "amount": 30, "status": "pending"}],
        "cosplays": [{"id": "c1", "user_name": "Sam", "character_name": "Makima"}, {"id": "c2", "user_name": "Pip", "character_name": "Denji"}],
        "story_photos": [{"id": "p1", "uploaded_by": "Sam", "image_url": "u", "taken_on": None, "created_at": "t"}, {"id": "p2", "uploaded_by": "Pip", "image_url": "v"}],
        "ticket_votes": [{"id": "v1", "voter": "Sam", "choice": "o1", "updated_at": "t"}, {"id": "v2", "voter": "Pip", "choice": "o2", "updated_at": "t"}],
        "feedback": [{"id": "f1", "user_name": "Sam", "message": "Mooi"}, {"id": "f2", "user_name": None, "message": "Anoniem"}],
    })


def test_the_export_holds_only_the_members_own_rows_under_every_name_they_have(monkeypatch):
    monkeypatch.setattr(member_export, "supabase", _export_db())
    data = member_export.build_export({"name": "Sam", "passcode": "secret", "bio": "hi"}, ["Sam", "Samdraws"])

    assert data["profile"] == {"name": "Sam", "bio": "hi"}
    assert data["trip_days"] == [{"event": "Dokomi", "date": "2027-05-21"}]
    assert [(r["as"], r["start_location"]) for r in data["rides"]] == [("bestuurder", "A"), ("passagier", "B")]
    assert data["meals"] == []
    assert [e["description"] for e in data["expenses_paid"]] == ["Hotel"]
    assert [s["amount"] for s in data["expense_shares"]] == [30]
    assert [c["character_name"] for c in data["cosplays"]] == ["Makima"]
    assert [p["image_url"] for p in data["photos"]] == ["u"]
    assert [v["choice"] for v in data["ticket_votes"]] == ["o1"]
    assert [f["message"] for f in data["feedback"]] == ["Mooi"]


def test_the_export_endpoint_gives_a_json_download(monkeypatch):
    db = _export_db()
    db.tables["profiles"] = [{"id": "u1", "name": "Sam", "aliases": ["Samdraws", "Pip"], "passcode": "secret"},
                             {"id": "u2", "name": "Pip", "aliases": []}]
    monkeypatch.setattr(users_router, "supabase", db)
    monkeypatch.setattr(member_export, "supabase", db)

    response = users_router.export_my_data("Sam")

    assert "attachment" in response.headers["content-disposition"]
    body = json.loads(response.body)
    # "Pip" is another member's name, so it is not one of Sam's: none of Pip's rows are in the file.
    assert body["names"] == ["Sam", "Samdraws"]
    assert "passcode" not in body["profile"]
    assert [c["character_name"] for c in body["cosplays"]] == ["Makima"]


# ── a request to delete the account ──────────────────────────────────────────

def test_a_broadcast_for_admins_always_reaches_every_admin_and_nobody_else(monkeypatch, sent):
    monkeypatch.setattr(svc, "_local_hour", lambda: 12)
    monkeypatch.setattr(svc, "_fetch_profiles", lambda category: [
        _profile("Admin", is_admin=True, notification_categories=[]),
        _profile("Other admin", is_admin=True, notification_categories=["new_user"]),
        _profile("Member", notification_categories=["account_deletion"]),
    ])
    svc.broadcast_category_dm("tok", svc.NotificationCategory.ACCOUNT_DELETION, "hi", admins_always=True)
    assert sent["push"] == ["Admin", "Other admin"]
    assert sent["dm"] == ["id-Admin", "id-Other admin"]


def test_the_deletion_category_is_not_one_a_member_can_choose():
    assert svc.NotificationCategory.ACCOUNT_DELETION not in svc.ALL_CATEGORIES


class _InsertDb:
    def __init__(self):
        self.inserted = []

    def table(self, name):
        outer = self

        class _Q:
            def insert(self, row):
                outer.inserted.append((name, row))
                return self

            def execute(self):
                return _Result([])

        return _Q()


def test_a_deletion_request_is_saved_for_the_admins_and_tells_them_all(monkeypatch):
    from fastapi import BackgroundTasks

    db = _InsertDb()
    monkeypatch.setattr(users_router, "supabase", db)
    monkeypatch.setattr(users_router, "_deletion_requested", {})
    tasks = BackgroundTasks()
    settings = SimpleNamespace(app_url="https://con.example.org/", discord_bot_token="tok")

    users_router.request_account_deletion(tasks, "Sam", settings)

    assert db.inserted[0][0] == "feedback" and db.inserted[0][1]["user_name"] == "Sam" and db.inserted[0][1]["kind"] == "other"
    assert len(tasks.tasks) == 1
    task = tasks.tasks[0]
    assert task.func is svc.broadcast_category_dm and task.kwargs["admins_always"] is True
    assert "Sam" in task.args[2] and "https://con.example.org/admin/users" in task.args[2]


def test_a_deletion_request_is_not_repeated_over_and_over(monkeypatch):
    from fastapi import BackgroundTasks

    monkeypatch.setattr(users_router, "supabase", _InsertDb())
    monkeypatch.setattr(users_router, "_deletion_requested", {})
    settings = SimpleNamespace(app_url="", discord_bot_token="tok")
    for _ in range(2):
        users_router.request_account_deletion(BackgroundTasks(), "Sam", settings)
    with pytest.raises(HTTPException) as err:
        users_router.request_account_deletion(BackgroundTasks(), "Sam", settings)
    assert err.value.status_code == 429
