"""A returning member's avatar_url is not just filled once and frozen forever — it is
re-checked periodically, so a changed or since-broken Discord/Google picture heals
itself on a later login instead of staying wrong (or a broken image) indefinitely."""
from datetime import datetime, timedelta, timezone

import pytest

from app import dependencies as deps
from app.config import get_settings

USER_ID = "11111111-1111-1111-1111-111111111111"


class _Result:
    def __init__(self, data):
        self.data = data


class FakeSupabase:
    """Records every profiles update; nothing else in this module touches Supabase."""

    def __init__(self):
        self.updates: list[dict] = []

    def table(self, name):
        assert name == "profiles"
        return self

    def update(self, payload):
        self.updates.append(payload)
        return self

    def eq(self, *_):
        return self

    def execute(self):
        return _Result([])


def _profile(**overrides) -> dict:
    row = {
        "name": "Jams", "is_active": True, "is_first_login": False, "allow_dm": True,
        "discord_id": "d1", "discord_username": "jams", "email": "jams@example.com",
        "avatar_url": "https://cdn.discordapp.com/avatars/d1/old.png", "avatar_synced_at": None,
    }
    row.update(overrides)
    return row


@pytest.fixture
def fake(monkeypatch):
    fake = FakeSupabase()
    monkeypatch.setattr(deps, "supabase", fake)
    return fake


def _identity(avatar="https://cdn.discordapp.com/avatars/d1/new.png"):
    return deps.VerifiedIdentity(discord_id="d1", discord_username="jams", discord_avatar=avatar)


def test_the_new_avatar_and_a_fresh_timestamp_are_written(fake, monkeypatch):
    monkeypatch.setattr(deps, "_verified_identity", lambda _uid: _identity())
    deps._finalize_returning_user(_profile(avatar_synced_at=None), USER_ID, get_settings())
    assert len(fake.updates) == 1
    update = fake.updates[0]
    assert update["avatar_url"] == "https://cdn.discordapp.com/avatars/d1/new.png"
    assert "avatar_synced_at" in update


def test_a_recently_synced_avatar_is_left_alone(fake, monkeypatch):
    called = []
    monkeypatch.setattr(deps, "_verified_identity", lambda uid: (called.append(uid), _identity())[1])
    recent = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    deps._finalize_returning_user(_profile(avatar_synced_at=recent), USER_ID, get_settings())
    assert called == []  # never even asked Supabase for the identity
    assert fake.updates == []


def test_a_day_old_sync_is_refreshed_again(fake, monkeypatch):
    monkeypatch.setattr(deps, "_verified_identity", lambda _uid: _identity())
    old = (datetime.now(timezone.utc) - timedelta(hours=25)).isoformat()
    deps._finalize_returning_user(_profile(avatar_synced_at=old), USER_ID, get_settings())
    assert len(fake.updates) == 1


def test_an_unchanged_avatar_still_stamps_the_timestamp_so_it_is_not_checked_again_next_request(fake, monkeypatch):
    current = "https://cdn.discordapp.com/avatars/d1/old.png"
    monkeypatch.setattr(deps, "_verified_identity", lambda _uid: _identity(avatar=current))
    deps._finalize_returning_user(_profile(avatar_url=current, avatar_synced_at=None), USER_ID, get_settings())
    assert len(fake.updates) == 1
    assert "avatar_url" not in fake.updates[0]  # unchanged — not rewritten
    assert "avatar_synced_at" in fake.updates[0]  # but the check is recorded


def test_a_removed_avatar_is_not_overwritten_with_nothing(fake, monkeypatch):
    """Discord/Google momentarily reporting no avatar shouldn't blank out a real one."""
    monkeypatch.setattr(deps, "_verified_identity", lambda _uid: _identity(avatar=None))
    deps._finalize_returning_user(_profile(avatar_synced_at=None), USER_ID, get_settings())
    assert len(fake.updates) == 1
    assert "avatar_url" not in fake.updates[0]
    assert "avatar_synced_at" in fake.updates[0]


def test_a_custom_avatar_is_never_touched_by_the_resync(fake, monkeypatch):
    called = []
    monkeypatch.setattr(deps, "_verified_identity", lambda uid: (called.append(uid), _identity())[1])
    row = _profile(avatar_url="https://cdn.test/avatars/u1/mine.jpg", avatar_custom=True, avatar_synced_at=None)
    deps._finalize_returning_user(row, USER_ID, get_settings())
    assert called == []
    assert fake.updates == []


def test_a_deactivated_profile_is_still_refused_before_any_of_this(fake, monkeypatch):
    from fastapi import HTTPException
    monkeypatch.setattr(deps, "_verified_identity", lambda _uid: _identity())
    with pytest.raises(HTTPException) as e:
        deps._finalize_returning_user(_profile(is_active=False), USER_ID, get_settings())
    assert e.value.status_code == 403
    assert fake.updates == []
