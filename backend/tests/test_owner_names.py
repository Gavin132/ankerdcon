"""Ownership under a former name. Rows keep the name they were made under, so after a rename (kept as an
alias) or for a Discord username, the member must still own them: delete their old ride, expense, cosplay or
story photo. Only the caller's own names count, never another member's."""
import pytest
from fastapi import HTTPException

from app import dependencies as deps
from app.routers import cosplays, stories

PROFILES = [
    {"name": "Sam", "discord_username": "samdraws", "aliases": ["Sammie"], "is_admin": False},
    {"name": "Alex", "discord_username": "alexx", "aliases": ["Lex"], "is_admin": False},
    {"name": "Beheer", "discord_username": None, "aliases": [], "is_admin": True},
]


class _Result:
    def __init__(self, data):
        self.data = data


class _Table:
    def __init__(self, db, name):
        self.db, self.name, self.filters, self.deleted = db, name, {}, False

    def select(self, *_):
        return self

    def eq(self, col, val):
        self.filters[col] = val
        return self

    def delete(self):
        self.deleted = True
        return self

    def execute(self):
        rows = [r for r in self.db.tables.get(self.name, []) if all(r.get(k) == v for k, v in self.filters.items())]
        if self.deleted:
            self.db.deletes.append((self.name, dict(self.filters)))
        return _Result(rows)


class FakeSupabase:
    def __init__(self, profiles=PROFILES, **tables):
        self.tables = {"profiles": [dict(p) for p in profiles], **tables}
        self.deletes = []

    def table(self, name):
        return _Table(self, name)


@pytest.fixture
def db(monkeypatch):
    fake = FakeSupabase()
    monkeypatch.setattr(deps, "supabase", fake)
    return fake


def test_the_current_name_owns_without_a_lookup(monkeypatch):
    monkeypatch.setattr(deps, "supabase", None)  # any lookup would blow up
    deps.require_owner_or_admin("Sam", "Sam", "nee")


def test_a_former_name_still_owns(db):
    deps.require_owner_or_admin("Sam", "Sammie", "nee")


def test_a_discord_username_still_owns(db):
    deps.require_owner_or_admin("Sam", "samdraws", "nee")


def test_a_stranger_does_not_own(db):
    with pytest.raises(HTTPException) as e:
        deps.require_owner_or_admin("Sam", "Alex", "nee")
    assert e.value.status_code == 403
    with pytest.raises(HTTPException):
        deps.require_owner_or_admin("Sam", "Lex", "nee")  # Alex's former name
    with pytest.raises(HTTPException):
        deps.require_owner_or_admin("Sam", None, "nee")


def test_an_admin_may_still_change_anyones(db):
    deps.require_owner_or_admin("Beheer", "Alex", "nee")
    deps.require_owner_or_admin("Beheer", "Sammie", "nee")


def test_a_name_that_belongs_to_another_profile_does_not_count(db):
    # Members edit their own aliases; "Alex" in Sam's list (or a case variant) must not hand over Alex's rows.
    db.tables["profiles"][0]["aliases"] = ["Sammie", "Alex", "LEX", "alexx"]
    assert deps.is_own_name("Sam", "Sammie")
    assert not deps.is_own_name("Sam", "Alex")
    assert not deps.is_own_name("Sam", "Lex")
    assert not deps.is_own_name("Sam", "alexx")
    with pytest.raises(HTTPException):
        deps.require_owner_or_admin("Sam", "Alex", "nee")


def test_a_failed_lookup_grants_nothing(monkeypatch):
    class Broken:
        def table(self, _):
            raise RuntimeError("down")

    monkeypatch.setattr(deps, "supabase", Broken())
    assert deps.is_own_name("Sam", "Sam")  # needs no lookup
    assert not deps.is_own_name("Sam", "Sammie")


def test_acting_as_a_former_name_follows_the_same_rule(db):
    assert deps.act_as("Sam", "Sammie") == "Sammie"
    assert deps.act_as("Sam", "samdraws") == "samdraws"
    with pytest.raises(HTTPException):
        deps.act_as("Sam", "Alex")


# ── The routes that use it ───────────────────────────────────────────────────

def test_a_renamed_member_can_delete_their_old_cosplay(db, monkeypatch):
    db.tables["cosplays"] = [{"id": "c1", "user_name": "Sammie"}, {"id": "c2", "user_name": "Alex"}]
    monkeypatch.setattr(cosplays, "supabase", db)
    cosplays.delete_cosplay("c1", "Sam")
    assert ("cosplays", {"id": "c1"}) in db.deletes
    with pytest.raises(HTTPException) as e:
        cosplays.delete_cosplay("c2", "Sam")
    assert e.value.status_code == 403


def test_a_renamed_member_can_delete_their_old_story_photo(db, monkeypatch):
    db.tables["story_photos"] = [
        {"id": "p1", "uploaded_by": "samdraws", "image_url": "https://cdn.test/b/x/1.jpg"},
        {"id": "p2", "uploaded_by": "Alex", "image_url": "https://cdn.test/b/x/2.jpg"},
    ]
    monkeypatch.setattr(stories, "supabase", db)
    monkeypatch.setattr(stories.minio_client, "delete_object", lambda key: None)
    stories.delete_story_photo("p1", "Sam")
    assert ("story_photos", {"id": "p1"}) in db.deletes
    with pytest.raises(HTTPException) as e:
        stories.delete_story_photo("p2", "Sam")
    assert e.value.status_code == 403
    # Story photos stay owner-only: an admin is not let in by this change.
    with pytest.raises(HTTPException):
        stories.delete_story_photo("p2", "Beheer")
