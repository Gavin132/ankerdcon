import pytest
from fastapi import HTTPException

from app import dependencies
from app.dependencies import act_as, act_for_anyone


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
