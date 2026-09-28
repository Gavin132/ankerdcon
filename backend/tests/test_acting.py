import pytest
from fastapi import HTTPException

from app import dependencies
from app.dependencies import act_as, act_for_anyone, act_for_anyone_bulk


def test_members_may_sign_anyone_up():
    assert act_for_anyone("Sam", "Alex") == "Alex"


def test_no_name_means_yourself():
    assert act_for_anyone("Sam", None) == "Sam"
    assert act_for_anyone("Sam", "  ") == "Sam"


def test_things_that_belong_to_one_person_stay_restricted(monkeypatch):
    monkeypatch.setattr(dependencies, "_is_admin", lambda name: False)
    monkeypatch.setattr(dependencies, "_is_own_former_name", lambda me, name: False)
    assert act_as("Sam", "Sam") == "Sam"
    with pytest.raises(HTTPException) as e:
        act_as("Sam", "Alex")
    assert e.value.status_code == 403


def test_adding_someone_needs_a_real_member(monkeypatch):
    monkeypatch.setattr(dependencies, "_profile_exists", lambda name: name == "Alex")
    assert act_for_anyone("Sam", "Alex", adding=True) == "Alex"
    assert act_for_anyone("Sam", None, adding=True) == "Sam"  # yourself needs no lookup
    with pytest.raises(HTTPException) as e:
        act_for_anyone("Sam", "Nobody Real", adding=True)
    assert e.value.status_code == 400


def test_taking_a_name_off_accepts_any_name(monkeypatch):
    monkeypatch.setattr(dependencies, "_profile_exists", lambda name: False)
    assert act_for_anyone("Sam", "Renamed Person") == "Renamed Person"


# ── act_for_anyone_bulk ──────────────────────────────────────────────────────
# Signing several people up for several days used to fire one profile lookup
# (and one write) per person; the bulk form does one lookup for the whole list.

class _FakeMembers:
    """Answers exactly the one query act_for_anyone_bulk makes: select name
    from profiles where name in (...). Records how many times it was asked."""

    def __init__(self, real_names: set[str]):
        self.real_names, self.calls = real_names, 0

    def table(self, name):
        assert name == "profiles"
        return self

    def select(self, *_):
        return self

    def in_(self, _col, names):
        self.calls += 1
        self._asked = names
        return self

    def execute(self):
        class _Result:
            data = [{"name": n} for n in self._asked if n in self.real_names]
        return _Result()


def test_bulk_checks_every_name_in_one_call(monkeypatch):
    members = _FakeMembers({"Alex", "Robin"})
    monkeypatch.setattr(dependencies, "supabase", members)
    assert act_for_anyone_bulk("Sam", ["Alex", "Robin"], adding=True) == ["Alex", "Robin"]
    assert members.calls == 1


def test_bulk_never_checks_yourself(monkeypatch):
    members = _FakeMembers(set())
    monkeypatch.setattr(dependencies, "supabase", members)
    assert act_for_anyone_bulk("Sam", ["Sam", "Sam"], adding=True) == ["Sam", "Sam"]
    assert members.calls == 0


def test_bulk_names_a_made_up_person_in_the_error(monkeypatch):
    members = _FakeMembers({"Alex"})
    monkeypatch.setattr(dependencies, "supabase", members)
    with pytest.raises(HTTPException) as e:
        act_for_anyone_bulk("Sam", ["Alex", "Nobody Real"], adding=True)
    assert e.value.status_code == 400
    assert "Nobody Real" in e.value.detail


def test_bulk_leaving_accepts_any_name_without_a_lookup(monkeypatch):
    members = _FakeMembers(set())
    monkeypatch.setattr(dependencies, "supabase", members)
    assert act_for_anyone_bulk("Sam", ["Renamed Person"]) == ["Renamed Person"]
    assert members.calls == 0
