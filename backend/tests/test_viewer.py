"""Read-only members ("kijkers"): they can look, and change only their own account."""
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

import app.dependencies as deps


@pytest.fixture(autouse=True)
def fresh_cache():
    deps._viewer_cache.clear()


# ── what a viewer may still do ───────────────────────────────────────────────

@pytest.mark.parametrize("method,path", [
    ("GET", "/api/rides/"),
    ("HEAD", "/api/meals/"),
    ("PUT", "/api/users/preferences"),
    ("POST", "/api/users/me/onboarding"),
    ("POST", "/api/users/me/test-notification"),
    ("POST", "/api/users/avatar"),
    ("DELETE", "/api/users/banner"),
    ("POST", "/api/push/subscribe"),
    ("DELETE", "/api/push/subscribe"),
    ("POST", "/api/feedback/"),
    ("PUT", "/api/stories/9f1c/seen"),
])
def test_what_a_viewer_may_do(method, path):
    assert deps.viewer_may_write(method, path)


@pytest.mark.parametrize("method,path", [
    ("POST", "/api/rides/"),
    ("POST", "/api/rides/abc/claim"),
    ("POST", "/api/meals/abc/rsvp"),
    ("PUT", "/api/meals/abc"),
    ("DELETE", "/api/meals/abc"),
    ("POST", "/api/expenses/"),
    ("POST", "/api/cosplays/"),
    ("POST", "/api/stories/9f1c"),           # uploading a photo is not "seen"
    ("PUT", "/api/users/abc/location"),      # sharing a location
    ("PATCH", "/api/users/name"),
    ("POST", "/api/parking/trip"),
    ("PUT", "/api/ride-costs/trip"),
    ("POST", "/api/calendar/day/rsvp"),
    ("PUT", "/api/users/preferences/extra"),  # only the exact routes
])
def test_what_a_viewer_may_not_do(method, path):
    assert not deps.viewer_may_write(method, path)


# ── the check itself ─────────────────────────────────────────────────────────

class _Result:
    def __init__(self, data):
        self.data = data


class _Profiles:
    def __init__(self, rows=None, fail=False):
        self.rows, self.fail, self.calls = rows or [], fail, 0

    def table(self, _name):
        return self

    def select(self, *_):
        return self

    def eq(self, col, val):
        self._match = [r for r in self.rows if r.get(col) == val]
        return self

    def execute(self):
        self.calls += 1
        if self.fail:
            raise RuntimeError("column does not exist")
        return _Result(self._match)


def test_a_viewer_is_read_only_but_an_admin_never_is(monkeypatch):
    monkeypatch.setattr(deps, "supabase", _Profiles([
        {"name": "Kijker", "is_viewer": True, "is_admin": False},
        {"name": "Beheer", "is_viewer": True, "is_admin": True},
        {"name": "Lid", "is_viewer": False, "is_admin": False},
    ]))
    assert deps._is_viewer("Kijker") is True
    assert deps._is_viewer("Beheer") is False
    assert deps._is_viewer("Lid") is False
    assert deps._is_viewer("Onbekend") is False


def test_the_answer_is_remembered_and_can_be_forgotten(monkeypatch):
    db = _Profiles([{"name": "Kijker", "is_viewer": True, "is_admin": False}])
    monkeypatch.setattr(deps, "supabase", db)
    deps._is_viewer("Kijker")
    deps._is_viewer("Kijker")
    assert db.calls == 1
    db.rows[0]["is_viewer"] = False
    assert deps._is_viewer("Kijker") is True  # still the remembered one
    deps.forget_viewer("Kijker")
    assert deps._is_viewer("Kijker") is False


def test_a_database_without_the_column_locks_nobody_out(monkeypatch):
    db = _Profiles(fail=True)
    monkeypatch.setattr(deps, "supabase", db)
    assert deps._is_viewer("Kijker") is False
    deps._is_viewer("Kijker")
    assert db.calls == 2  # a failed check is not remembered


# ── through a real request ───────────────────────────────────────────────────

def _app(monkeypatch, name="Kijker", viewer=True):
    monkeypatch.setattr(deps, "_authenticate", lambda credentials, settings: name)
    monkeypatch.setattr(deps, "_is_viewer", lambda n: viewer)
    app = FastAPI()

    @app.get("/api/things")
    def read(_: str = Depends(deps.get_current_user)):
        return {"ok": True}

    @app.post("/api/things")
    def write(_: str = Depends(deps.get_current_user)):
        return {"ok": True}

    @app.put("/api/users/preferences")
    def prefs(_: str = Depends(deps.get_current_user)):
        return {"ok": True}

    return TestClient(app)


AUTH = {"Authorization": "Bearer x"}


def test_a_viewer_can_read(monkeypatch):
    assert _app(monkeypatch).get("/api/things", headers=AUTH).status_code == 200


def test_a_viewer_cannot_write_and_is_told_why(monkeypatch):
    response = _app(monkeypatch).post("/api/things", headers=AUTH)
    assert response.status_code == 403
    assert "alleen-lezen" in response.json()["detail"]
    # Not the "Geen toegang" screen: that is for accounts that may not use the app at all.
    assert "x-access" not in response.headers


def test_a_viewer_can_change_their_own_settings(monkeypatch):
    assert _app(monkeypatch).put("/api/users/preferences", headers=AUTH).status_code == 200


def test_everyone_else_can_write(monkeypatch):
    assert _app(monkeypatch, name="Lid", viewer=False).post("/api/things", headers=AUTH).status_code == 200


# ── becoming a viewer ────────────────────────────────────────────────────────

def test_a_new_member_from_a_viewer_whitelist_entry_is_a_viewer(monkeypatch):
    class Whitelist:
        def __init__(self):
            self.filters = {}

        def table(self, _n):
            return self

        def select(self, *_):
            return self

        def eq(self, col, val):
            self.filters[col] = val
            return self

        def execute(self):
            f, self.filters = self.filters, {}
            return _Result([{"viewer": True}] if f.get("discord_id") == "d-kijker" and f.get("viewer") else [])

    monkeypatch.setattr(deps, "supabase", Whitelist())
    assert deps._whitelisted_as_viewer({"discord_id": "d-kijker"}) is True
    assert deps._whitelisted_as_viewer({"discord_id": "d-lid"}) is False
    assert deps._whitelisted_as_viewer({"email": "iemand@example.com"}) is False


def test_a_missing_whitelist_column_means_nobody_is_a_viewer(monkeypatch):
    monkeypatch.setattr(deps, "supabase", _Profiles(fail=True))
    assert deps._whitelisted_as_viewer({"discord_id": "d1"}) is False
