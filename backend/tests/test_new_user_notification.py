"""The "Nieuwe gebruiker" notification: an admin can ask to hear when somebody logs in for the first
time (a new profile that may need merging with a placeholder). Off by default, admins only (enforced
here, not just hidden in the app), sent once per created profile and never able to break a login.

First logins run through the real `_authenticate`; only Supabase, the token check and the senders are
faked."""
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient

from app import dependencies as deps
from app.routers import users as users_router
from app.routes import UserRoutes
from app.services import discord_bot, notification_service as svc, push_service

NEW_ID = "22222222-2222-2222-2222-222222222222"
CREDENTIALS = HTTPAuthorizationCredentials(scheme="Bearer", credentials="token")
SETTINGS = SimpleNamespace(discord_bot_token="tok", app_url="https://con.example.org/")


class _Result:
    def __init__(self, data):
        self.data = data


class _Query:
    """Just enough of the Supabase query builder for the sign-in code."""

    def __init__(self, db, name):
        self.db, self.name = db, name
        self.conds, self.op, self.payload = [], "select", None

    def select(self, *_):
        return self

    def eq(self, col, val):
        self.conds.append((col, "eq", val))
        return self

    def is_(self, col, _null):
        self.conds.append((col, "is", None))
        return self

    def insert(self, payload):
        self.op, self.payload = "insert", payload
        return self

    def update(self, payload):
        self.op, self.payload = "update", payload
        return self

    def _matches(self, row):
        return all((row.get(c) == v) if kind == "eq" else (row.get(c) is None) for c, kind, v in self.conds)

    def execute(self):
        rows = self.db.tables.setdefault(self.name, [])
        if self.op == "insert":
            if self.db.fail_insert:
                raise RuntimeError("duplicate key value violates unique constraint")
            if any(r.get("id") == self.payload.get("id") for r in rows):
                raise RuntimeError("duplicate key value violates unique constraint")
            rows.append(dict(self.payload))
            return _Result([dict(self.payload)])
        matched = [r for r in rows if self._matches(r)]
        if self.op == "update":
            for r in matched:
                r.update(self.payload)
            return _Result([dict(r) for r in matched])
        return _Result([dict(r) for r in matched])


class FakeDb:
    def __init__(self, profiles, whitelist=()):
        self.tables = {"profiles": [dict(p) for p in profiles], "whitelist": [dict(w) for w in whitelist]}
        self.fail_insert = False

    def table(self, name):
        return _Query(self, name)

    def profile(self, name):
        return next((p for p in self.tables["profiles"] if p["name"] == name), None)


def _profile(name, **overrides):
    row = {
        "id": f"id-{name}", "name": name, "discord_id": f"d-{name}", "is_active": True, "allow_dm": True,
        "is_admin": False, "is_first_login": False, "notification_categories": [],
    }
    row.update(overrides)
    return row


ADMIN_ON = _profile("AdminOn", is_admin=True, notification_categories=["new_user"])
ADMIN_ON_2 = _profile("AdminOn2", is_admin=True, notification_categories=["new_user", "ride_created"])
ADMIN_OFF = _profile("AdminOff", is_admin=True, notification_categories=["feedback_submitted"])
ADMIN_GONE = _profile("AdminGone", is_admin=True, is_active=False, notification_categories=["new_user"])
EX_ADMIN = _profile("ExAdmin", is_admin=False, notification_categories=["new_user"])  # lost admin, kept the choice
MEMBER = _profile("Member", notification_categories=["ride_created"])
EVERYONE = [ADMIN_ON, ADMIN_ON_2, ADMIN_OFF, ADMIN_GONE, EX_ADMIN, MEMBER]


@pytest.fixture
def world(monkeypatch):
    """Returns build(profiles, whitelist) -> (db, sent), with sent["dm"] / sent["push"] recorded and the
    background thread replaced by a direct call, so a test sees the result at once."""

    def build(profiles=EVERYONE, whitelist=({"discord_id": "new-discord"},)):
        db = FakeDb(profiles, whitelist)
        sent = {"dm": [], "push": [], "push_url": [], "push_title": []}
        for module in (deps, svc):
            monkeypatch.setattr(module, "supabase", db)
        monkeypatch.setattr(deps, "get_settings", lambda: SETTINGS)
        monkeypatch.setattr(deps, "_run_in_background", lambda target, *args: target(*args))
        monkeypatch.setattr(deps, "_decode_token", lambda token, settings: {"sub": NEW_ID})
        monkeypatch.setattr(deps, "_verified_identity", lambda user_id: deps.VerifiedIdentity(
            discord_id="new-discord", discord_username="nieuwkomer", discord_avatar=None))
        monkeypatch.setattr(discord_bot, "send_welcome_dm", lambda *a: None)
        monkeypatch.setattr(discord_bot, "send_dm", lambda token, discord_id, content: sent["dm"].append((discord_id, content)))
        monkeypatch.setattr(
            push_service, "send_push",
            lambda settings, names, title, body, url="/": (sent["push"].append(names), sent["push_title"].append(title), sent["push_url"].append(url)),
        )
        return db, sent

    return build


def _login():
    return deps._authenticate(CREDENTIALS, deps.get_settings())


# ── who gets it, and when ────────────────────────────────────────────────────

def test_a_first_login_notifies_exactly_the_active_admins_who_asked(world):
    db, sent = world()
    assert _login() == "nieuwkomer"
    assert db.profile("nieuwkomer")["is_first_login"] is False  # the login itself completed normally
    assert sorted(d for d, _ in sent["dm"]) == ["d-AdminOn", "d-AdminOn2"]
    assert sent["push"] == [["AdminOn", "AdminOn2"]]
    assert sent["push_title"] == ["Nieuwe gebruiker"]
    assert sent["push_url"] == ["/admin/users"]


def test_the_message_names_the_person_and_points_to_the_merge_page(world):
    _, sent = world()
    _login()
    content = sent["dm"][0][1]
    assert "nieuwkomer heeft voor het eerst ingelogd" in content
    assert "placeholder" in content and "Admin → Gebruikers" in content
    assert content.endswith("https://con.example.org/admin/users")


def test_the_name_is_shown_literally_not_as_markdown(world):
    _, sent = world()
    svc.notify_new_user("tok", "[klik](https://phishing.example)", "")
    assert "\\[klik\\]\\(https://phishing.example\\)" in sent["dm"][0][1]


def test_nobody_is_notified_when_no_admin_asked(world):
    _, sent = world([ADMIN_OFF, EX_ADMIN, MEMBER])
    _login()
    assert sent["dm"] == [] and sent["push"] == [[]]


def test_an_admin_who_asked_but_has_no_discord_still_gets_the_push(world):
    _, sent = world([_profile("PushAdmin", is_admin=True, discord_id=None, notification_categories=["new_user"])])
    _login()
    assert sent["dm"] == []
    assert sent["push"] == [["PushAdmin"]]


def test_an_admin_with_dms_switched_off_gets_no_dm(world):
    _, sent = world([_profile("Quiet", is_admin=True, allow_dm=False, notification_categories=["new_user"])])
    _login()
    assert sent["dm"] == [] and sent["push"] == [["Quiet"]]


def test_a_google_first_login_notifies_too(world, monkeypatch):
    db, sent = world(whitelist=({"email": "g@example.com"},))
    monkeypatch.setattr(deps, "_verified_identity", lambda user_id: deps.VerifiedIdentity(
        email="g@example.com", email_display_name="Gwen"))
    assert _login() == "Gwen"
    assert sorted(d for d, _ in sent["dm"]) == ["d-AdminOn", "d-AdminOn2"]


def test_the_new_user_is_never_told_about_themselves(world):
    """Even a new profile that somehow is an admin who asked (it cannot be: new profiles are members)
    is not among the recipients."""
    db, sent = world([ADMIN_ON])
    _login()
    assert "nieuwkomer" not in [name for names in sent["push"] for name in names]


# ── not a new profile ────────────────────────────────────────────────────────

def test_claiming_a_placeholder_is_not_a_new_user(world):
    stub = _profile("nieuwkomer", discord_id=None, email=None, is_first_login=True)
    db, sent = world([stub, ADMIN_ON])
    assert _login() == "nieuwkomer"
    assert len(db.tables["profiles"]) == 2  # no profile was created
    assert sent["dm"] == [] and sent["push"] == []


def test_a_returning_member_is_not_a_new_user(world):
    returning = _profile("nieuwkomer", id=NEW_ID, discord_id="new-discord")
    _, sent = world([returning, ADMIN_ON])
    assert _login() == "nieuwkomer"
    assert sent["dm"] == [] and sent["push"] == []


def test_an_admin_creating_a_profile_by_hand_does_not_notify():
    """`admin_create_user` inserts the row itself and never goes through `_create_profile`."""
    import inspect
    from app.routers import admin

    source = inspect.getsource(admin.admin_create_user)
    assert "_create_profile" not in source and "notify_new_user" not in source


# ── once, and never in the way of the login ──────────────────────────────────

def test_a_repeated_login_notifies_once(world):
    db, sent = world()
    _login()
    _login()  # the profile now exists: found by id, not created again
    assert len(sent["push"]) == 1 and len(sent["dm"]) == 2


def test_a_concurrent_login_that_loses_the_insert_does_not_notify(world):
    """Two requests race to create the same profile: the database refuses the second insert, and only
    the one that created the row announces it."""
    db, sent = world()
    db.tables["profiles"].append(_profile("race", id=NEW_ID, discord_id="other"))  # the winner's row
    with pytest.raises(HTTPException):
        deps._create_profile({"id": NEW_ID, "name": "nieuwkomer", "discord_id": "new-discord"})
    assert sent["dm"] == [] and sent["push"] == []


def test_a_failing_sender_does_not_break_the_login(world, monkeypatch):
    _, sent = world()

    def boom(*args, **kwargs):
        raise RuntimeError("discord is down")

    monkeypatch.setattr(discord_bot, "send_dm", boom)
    monkeypatch.setattr(push_service, "send_push", boom)
    assert _login() == "nieuwkomer"


def test_a_failing_profile_lookup_does_not_break_the_login(world, monkeypatch):
    db, _ = world()
    real = svc.supabase

    class Broken:
        def table(self, name):
            raise RuntimeError("supabase down")

    monkeypatch.setattr(svc, "supabase", Broken())
    assert _login() == "nieuwkomer"
    assert real.profile("nieuwkomer") is not None


def test_a_broken_background_start_does_not_break_the_login(world, monkeypatch):
    def cannot_start(*args):
        raise RuntimeError("can't start new thread")

    world()
    monkeypatch.setattr(deps, "_run_in_background", cannot_start)
    assert _login() == "nieuwkomer"


def test_the_notification_runs_on_its_own_thread():
    """The real runner hands the work to a thread and returns at once."""
    import threading

    done, ran_on = threading.Event(), []
    deps._run_in_background(lambda: (ran_on.append(threading.current_thread()), done.set()))
    assert done.wait(2)
    assert ran_on[0] is not threading.current_thread() and ran_on[0].daemon


def test_a_failed_insert_notifies_nobody(world):
    db, sent = world()
    db.fail_insert = True
    with pytest.raises(HTTPException):
        _login()
    assert sent["dm"] == [] and sent["push"] == []


# ── admin only, at send time too ─────────────────────────────────────────────

def test_the_category_exists_and_is_admin_only():
    assert "new_user" in svc.ALL_CATEGORIES
    assert "new_user" in svc.ADMIN_ONLY_CATEGORIES


def test_a_former_admin_who_kept_the_choice_gets_nothing(world):
    _, sent = world([EX_ADMIN])
    _login()
    assert sent["dm"] == [] and sent["push"] == [[]]


# ── the setting: off by default, admins only (real requests) ─────────────────

@pytest.fixture
def settings_client(monkeypatch):
    """A client signed in as `who`, with a profiles table to save into; returns build(who, is_admin) -> (client, db)."""

    def build(who="Gavin", is_admin=True):
        db = FakeDb([_profile("Gavin", is_admin=True), _profile("Sam")])
        monkeypatch.setattr(users_router, "supabase", db)
        monkeypatch.setattr(deps, "_authenticate", lambda credentials, settings: who)
        monkeypatch.setattr(deps, "_is_viewer", lambda name: False)
        monkeypatch.setattr(users_router, "_is_admin", lambda name: is_admin)
        app = FastAPI()
        app.include_router(users_router.router, prefix="/api")
        return TestClient(app), db

    return build


PREFERENCES = "/api" + UserRoutes.PREFIX + UserRoutes.PREFERENCES
AUTH = {"Authorization": "Bearer x"}


def test_it_is_off_by_default(world):
    """Nobody has it until they choose it: a profile starts with no categories, a created one included."""
    from app.models.user import User

    assert User.model_fields["notification_categories"].get_default(call_default_factory=True) == []
    db, _ = world([])
    _login()
    assert db.profile("nieuwkomer").get("notification_categories") in (None, [])


def test_an_admin_can_turn_it_on_and_off(settings_client):
    client, db = settings_client("Gavin", is_admin=True)
    assert client.put(PREFERENCES, headers=AUTH, json={"notification_categories": ["new_user"]}).status_code == 204
    assert db.profile("Gavin")["notification_categories"] == ["new_user"]
    assert client.put(PREFERENCES, headers=AUTH, json={"notification_categories": []}).status_code == 204
    assert db.profile("Gavin")["notification_categories"] == []


def test_a_member_cannot_turn_it_on(settings_client):
    client, db = settings_client("Sam", is_admin=False)
    response = client.put(PREFERENCES, headers=AUTH, json={"notification_categories": ["ride_created", "new_user"]})
    assert response.status_code == 403
    assert "alleen voor admins" in response.json()["detail"]
    assert db.profile("Sam")["notification_categories"] == []


def test_a_member_cannot_turn_it_on_while_onboarding_either(settings_client):
    client, db = settings_client("Sam", is_admin=False)
    url = "/api" + UserRoutes.PREFIX + UserRoutes.ONBOARDING
    response = client.post(url, headers=AUTH, json={"notification_categories": ["new_user"]})
    assert response.status_code == 403
    assert db.profile("Sam")["notification_categories"] == []


def test_a_member_can_still_save_the_ordinary_categories(settings_client):
    client, db = settings_client("Sam", is_admin=False)
    assert client.put(PREFERENCES, headers=AUTH, json={"notification_categories": ["ride_created"]}).status_code == 204
    assert db.profile("Sam")["notification_categories"] == ["ride_created"]


def test_an_unknown_category_is_still_refused(settings_client):
    client, _ = settings_client("Gavin", is_admin=True)
    assert client.put(PREFERENCES, headers=AUTH, json={"notification_categories": ["nonsense"]}).status_code == 422
