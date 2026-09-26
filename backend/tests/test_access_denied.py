"""Only "this account may not use the app" makes the frontend show its Geen-toegang screen,
and a database hiccup must never look like "not an admin"."""
import pytest
from fastapi import HTTPException

from app import dependencies


def test_no_access_403_is_marked_for_the_frontend():
    e = dependencies._no_access("nope")
    assert e.status_code == 403 and e.headers == {"X-Access": "denied"}


def test_ordinary_403s_are_not_marked(monkeypatch):
    monkeypatch.setattr(dependencies, "_is_admin", lambda name: False)
    with pytest.raises(HTTPException) as e:
        dependencies.get_admin_user("Sam")
    assert e.value.status_code == 403 and not e.value.headers  # admins only: an error, not a sign-out


def test_a_database_error_is_a_503_not_a_refusal(monkeypatch):
    class Broken:
        def table(self, _):
            raise RuntimeError("supabase down")

    monkeypatch.setattr(dependencies, "supabase", Broken())
    with pytest.raises(HTTPException) as e:
        dependencies.get_admin_user("Sam")
    assert e.value.status_code == 503
    with pytest.raises(HTTPException) as e:
        dependencies.act_as("Sam", "Alex")
    assert e.value.status_code == 503
