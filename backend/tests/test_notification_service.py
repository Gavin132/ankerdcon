"""Category and personal notifications: Discord DM needs allow_dm + a linked
account; push needs only a subscription. Each channel is independent — one can
be off while the other still fires."""
import pytest

from app.services import notification_service as svc


class _Result:
    def __init__(self, data):
        self.data = data


class FakeSupabase:
    def __init__(self, rows):
        self.rows = rows

    def table(self, _name):
        return self

    def select(self, *_):
        return self

    def eq(self, _col, val):
        self._match = [r for r in self.rows if r.get("id") == val]
        return self

    def execute(self):
        return _Result(self._match if hasattr(self, "_match") else self.rows)


def _profile(**overrides):
    row = {
        "id": "u1", "name": "Sam", "discord_id": "d1", "is_active": True, "allow_dm": True,
        "notification_categories": ["ride_created"],
    }
    row.update(overrides)
    return row


@pytest.fixture
def pushed(monkeypatch):
    calls = []
    monkeypatch.setattr(svc.push_service, "send_push", lambda settings, names, title, body: calls.append(names))
    return calls


@pytest.fixture
def pushed_titles(monkeypatch):
    calls = []
    monkeypatch.setattr(svc.push_service, "send_push", lambda settings, names, title, body: calls.append(title))
    return calls


@pytest.fixture
def pushed_bodies(monkeypatch):
    calls = []
    monkeypatch.setattr(svc.push_service, "send_push", lambda settings, names, title, body: calls.append(body))
    return calls


@pytest.fixture
def dmed(monkeypatch):
    calls = []
    monkeypatch.setattr(svc.discord_bot, "send_dm", lambda token, discord_id, content: calls.append(discord_id))
    return calls


# ── broadcast_category_dm ───────────────────────────────────────────────────

def test_broadcasts_dm_and_push_to_an_opted_in_member(monkeypatch, dmed, pushed):
    monkeypatch.setattr(svc, "supabase", FakeSupabase([_profile()]))
    svc.broadcast_category_dm("tok", "ride_created", "🚗 **New ride**")
    assert dmed == ["d1"]
    assert pushed == [["Sam"]]


def test_a_member_without_the_category_gets_neither(monkeypatch, dmed, pushed):
    monkeypatch.setattr(svc, "supabase", FakeSupabase([_profile(notification_categories=[])]))
    svc.broadcast_category_dm("tok", "ride_created", "content")
    assert dmed == []
    assert pushed == [[]]


def test_allow_dm_off_skips_only_the_dm_not_the_push(monkeypatch, dmed, pushed):
    monkeypatch.setattr(svc, "supabase", FakeSupabase([_profile(allow_dm=False)]))
    svc.broadcast_category_dm("tok", "ride_created", "content")
    assert dmed == []
    assert pushed == [["Sam"]]


def test_no_discord_id_skips_only_the_dm_not_the_push(monkeypatch, dmed, pushed):
    monkeypatch.setattr(svc, "supabase", FakeSupabase([_profile(discord_id=None)]))
    svc.broadcast_category_dm("tok", "ride_created", "content")
    assert dmed == []
    assert pushed == [["Sam"]]


def test_no_bot_token_skips_only_the_dm_not_the_push(monkeypatch, dmed, pushed):
    monkeypatch.setattr(svc, "supabase", FakeSupabase([_profile()]))
    svc.broadcast_category_dm("", "ride_created", "content")
    assert dmed == []
    assert pushed == [["Sam"]]


def test_an_inactive_member_gets_neither(monkeypatch, dmed, pushed):
    monkeypatch.setattr(svc, "supabase", FakeSupabase([_profile(is_active=False)]))
    svc.broadcast_category_dm("tok", "ride_created", "content")
    assert dmed == []
    assert pushed == [[]]


def test_eligible_names_further_restricts_who_gets_it(monkeypatch, dmed, pushed):
    monkeypatch.setattr(svc, "supabase", FakeSupabase([
        _profile(name="Sam", discord_id="d1"),
        _profile(name="Timo", discord_id="d2"),
    ]))
    svc.broadcast_category_dm("tok", "ride_created", "content", eligible_names={"Timo"})
    assert dmed == ["d2"]
    assert pushed == [["Timo"]]


def test_eligible_names_none_means_no_extra_restriction(monkeypatch, dmed, pushed):
    monkeypatch.setattr(svc, "supabase", FakeSupabase([_profile()]))
    svc.broadcast_category_dm("tok", "ride_created", "content", eligible_names=None)
    assert dmed == ["d1"]
    assert pushed == [["Sam"]]


def test_push_title_is_the_category_not_the_app_name(monkeypatch, dmed, pushed_titles):
    monkeypatch.setattr(svc, "supabase", FakeSupabase([_profile()]))
    svc.broadcast_category_dm("tok", "meal_created", "🍽️ **Nieuwe activiteit: Pizza**")
    assert pushed_titles == ["Nieuwe activiteit"]


def test_push_title_falls_back_to_the_app_name_for_an_unknown_category(monkeypatch, dmed, pushed_titles):
    monkeypatch.setattr(svc, "supabase", FakeSupabase([_profile(notification_categories=["something_new"])]))
    svc.broadcast_category_dm("tok", "something_new", "content")
    assert pushed_titles == ["Ankerd Con"]


def test_push_body_does_not_repeat_the_title(monkeypatch, dmed, pushed_bodies):
    """The title ("Nieuwe activiteit") already shows in the notification chrome —
    the body shouldn't open with it again."""
    monkeypatch.setattr(svc, "supabase", FakeSupabase([_profile()]))
    svc.broadcast_category_dm("tok", "meal_created", "🍽️ **Nieuwe activiteit: Pizza**\n🕐 19:00")
    assert pushed_bodies == ["🍽️ Pizza"]


# ── send_personal_dm ─────────────────────────────────────────────────────────

def test_personal_dm_goes_to_both_channels(monkeypatch, dmed, pushed):
    monkeypatch.setattr(svc, "supabase", FakeSupabase([_profile()]))
    svc.send_personal_dm("tok", "u1", "content")
    assert dmed == ["d1"]
    assert pushed == [["Sam"]]


def test_personal_dm_push_title_defaults_to_the_app_name(monkeypatch, dmed, pushed_titles):
    monkeypatch.setattr(svc, "supabase", FakeSupabase([_profile()]))
    svc.send_personal_dm("tok", "u1", "content")
    assert pushed_titles == ["Ankerd Con"]


def test_personal_dm_push_title_can_be_overridden(monkeypatch, dmed, pushed_titles):
    monkeypatch.setattr(svc, "supabase", FakeSupabase([_profile()]))
    svc.send_personal_dm("tok", "u1", "content", title="Betaalverzoek")
    assert pushed_titles == ["Betaalverzoek"]


def test_personal_dm_push_does_not_need_allow_dm(monkeypatch, dmed, pushed):
    monkeypatch.setattr(svc, "supabase", FakeSupabase([_profile(allow_dm=False)]))
    svc.send_personal_dm("tok", "u1", "content")
    assert dmed == []
    assert pushed == [["Sam"]]


def test_personal_dm_to_an_inactive_profile_sends_nothing(monkeypatch, dmed, pushed):
    monkeypatch.setattr(svc, "supabase", FakeSupabase([_profile(is_active=False)]))
    svc.send_personal_dm("tok", "u1", "content")
    assert dmed == []
    assert pushed == []


def test_personal_dm_with_no_profile_id_sends_nothing(monkeypatch, dmed, pushed):
    svc.send_personal_dm("tok", "", "content")
    assert dmed == []
    assert pushed == []


# ── admin-only categories ────────────────────────────────────────────────────

def test_feedback_notifications_reach_admins_only(monkeypatch, dmed, pushed):
    rows = [
        _profile(id="a", name="Admin", discord_id="da", is_admin=True, notification_categories=["feedback_submitted"]),
        _profile(id="m", name="Member", discord_id="dm", is_admin=False, notification_categories=["feedback_submitted"]),
    ]
    monkeypatch.setattr(svc, "supabase", FakeSupabase(rows))
    svc.broadcast_category_dm("tok", "feedback_submitted", "💬 **Nieuwe feedback**")
    # A member who somehow carries the category (e.g. a former admin) gets nothing.
    assert dmed == ["da"]
    assert pushed == [["Admin"]]


def test_an_admin_who_did_not_ask_gets_no_feedback_notification(monkeypatch, dmed, pushed):
    monkeypatch.setattr(svc, "supabase", FakeSupabase([_profile(is_admin=True, notification_categories=["ride_created"])]))
    svc.broadcast_category_dm("tok", "feedback_submitted", "💬 **Nieuwe feedback**")
    assert dmed == [] and pushed == [[]]


def test_feedback_has_its_own_push_title(monkeypatch, dmed, pushed_titles):
    monkeypatch.setattr(svc, "supabase", FakeSupabase([_profile(is_admin=True, notification_categories=["feedback_submitted"])]))
    svc.broadcast_category_dm("tok", "feedback_submitted", "💬 **Nieuwe feedback (bug)**")
    assert pushed_titles == ["Nieuwe feedback"]


# ── "alleen voor mijn trips" ─────────────────────────────────────────────────

def test_a_member_on_the_default_setting_only_hears_about_their_own_trip(monkeypatch, dmed, pushed):
    rows = [
        _profile(id="a", name="Goes", discord_id="dg", notification_categories=["meal_created"], notify_own_trips_only=True),
        _profile(id="b", name="Stays", discord_id="ds", notification_categories=["meal_created"], notify_own_trips_only=True),
    ]
    monkeypatch.setattr(svc, "supabase", FakeSupabase(rows))
    svc.broadcast_category_dm("tok", "meal_created", "📅 **Nieuwe activiteit: Bowlen**", trip_names={"Goes"})
    assert dmed == ["dg"] and pushed == [["Goes"]]


def test_a_member_who_switched_it_off_hears_about_every_trip(monkeypatch, dmed, pushed):
    rows = [_profile(name="Stays", discord_id="ds", notification_categories=["meal_created"], notify_own_trips_only=False)]
    monkeypatch.setattr(svc, "supabase", FakeSupabase(rows))
    svc.broadcast_category_dm("tok", "meal_created", "x", trip_names={"Someone else"})
    assert dmed == ["ds"]


def test_without_a_trip_everyone_who_asked_gets_it(monkeypatch, dmed, pushed):
    rows = [_profile(name="Stays", discord_id="ds", notification_categories=["meal_created"], notify_own_trips_only=True)]
    monkeypatch.setattr(svc, "supabase", FakeSupabase(rows))
    svc.broadcast_category_dm("tok", "meal_created", "x", trip_names=None)
    assert dmed == ["ds"]


def test_the_default_applies_to_a_profile_that_has_no_setting_yet(monkeypatch, dmed, pushed):
    """A database without the column (migration not run) must still notify; the new default applies."""
    monkeypatch.setattr(svc, "supabase", FakeSupabase([_profile(name="Stays", notification_categories=["meal_created"])]))
    svc.broadcast_category_dm("tok", "meal_created", "x", trip_names={"Someone else"})
    assert dmed == []


def test_a_database_without_the_setting_does_not_silence_everything(monkeypatch, dmed):
    class NoColumn(FakeSupabase):
        def select(self, columns, *_):
            if "notify_own_trips_only" in columns:
                raise RuntimeError("column does not exist")
            return self

    monkeypatch.setattr(svc, "supabase", NoColumn([_profile(notification_categories=["meal_created"])]))
    svc.broadcast_category_dm("tok", "meal_created", "x")
    assert dmed == ["d1"]


def test_trip_names_are_everyone_on_any_day_of_the_trip(monkeypatch):
    class Days:
        def __init__(self):
            self.step = 0

        def table(self, _name):
            return self

        def select(self, columns):
            self.columns = columns
            return self

        def eq(self, col, val):
            self.col = col
            return self

        def execute(self):
            if self.columns == "event_id":
                return _Result([{"event_id": "E"}])
            return _Result([{"participants": ["A", "B"]}, {"participants": ["B", "C"]}, {"participants": None}])

    monkeypatch.setattr(svc, "supabase", Days())
    assert svc.trip_names_for_day("d1") == {"A", "B", "C"}
    assert svc.trip_names_for_day(None) is None


# ── testmelding ──────────────────────────────────────────────────────────────

def test_a_test_notification_goes_to_the_member_themselves(monkeypatch):
    from types import SimpleNamespace
    from fastapi import HTTPException
    from app.routers import users as users_router

    class One:
        def table(self, _n):
            return self

        def select(self, *_):
            return self

        def eq(self, *_):
            return self

        def execute(self):
            return _Result([{"id": "u1"}])

    sent = []
    monkeypatch.setattr(users_router, "supabase", One())
    monkeypatch.setattr(users_router.notification_service, "send_personal_dm", lambda token, pid, content, title: sent.append((pid, title)))
    users_router._test_sent.clear()
    settings = SimpleNamespace(discord_bot_token="tok")

    for _ in range(5):
        users_router.send_test_notification("Sam", settings)
    assert sent == [("u1", "Testmelding")] * 5
    with pytest.raises(HTTPException) as e:
        users_router.send_test_notification("Sam", settings)
    assert e.value.status_code == 429
    users_router.send_test_notification("Alex", settings)  # someone else is not affected
    assert len(sent) == 6
