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


# ── send_personal_dm ─────────────────────────────────────────────────────────

def test_personal_dm_goes_to_both_channels(monkeypatch, dmed, pushed):
    monkeypatch.setattr(svc, "supabase", FakeSupabase([_profile()]))
    svc.send_personal_dm("tok", "u1", "content")
    assert dmed == ["d1"]
    assert pushed == [["Sam"]]


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
