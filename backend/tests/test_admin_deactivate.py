"""Deactivating or deleting a member takes them off every list they were on, in bulk too."""
import pytest
from fastapi.testclient import TestClient

import main
from app import dependencies
from app.core import atomic
from app.dependencies import get_current_user
from app.routers import admin as admin_router
from app.services import profile_merge
from tests.test_admin_merge import FakeSupabase, real


@pytest.fixture
def env(monkeypatch):
    fake = FakeSupabase()
    for module in (admin_router, profile_merge, atomic, dependencies):
        monkeypatch.setattr(module, "supabase", fake)
    dms = []
    monkeypatch.setattr(admin_router.discord_bot, "send_deactivated_dm", lambda token, discord_id: dms.append(discord_id))
    fake.db["profiles"] = [
        real("admin", "Ada", is_admin=True),
        real("s", "Sam", aliases=["samdraws"], discord_id="d-sam", allow_dm=True),
        real("z", "Zoe"),
    ]
    fake.db["rides"] = [
        {"id": "r1", "driver": "Zoe", "passengers": ["Zoe", "Sam", "samdraws"], "restaurant_drivers": []},
        {"id": "r2", "driver": "Zoe", "passengers": ["Zoe"], "restaurant_drivers": [
            {"name": "Zoe", "seats": 3, "passengers": ["Zoe", "Sam"]},
            {"name": "Sam", "seats": 2, "passengers": ["Sam", "Zoe"]},
        ]},
    ]
    fake.db["meals"] = [{"id": "m1", "participants": ["Sam", "Zoe"]}]
    fake.db["event_days"] = [{"id": "d1", "participants": ["Sam"]}]
    fake.db["hotel_rooms"] = [{"id": "h1", "occupants": ["Zoe", "Sam"]}]
    main.app.dependency_overrides[get_current_user] = lambda: "Ada"
    yield fake, TestClient(main.app), dms
    main.app.dependency_overrides.clear()


def _assert_sam_is_gone(db):
    rides = {r["id"]: r for r in db["rides"]}
    assert rides["r1"]["passengers"] == ["Zoe"]  # the former name goes too
    # his own car goes, and he is no longer a passenger in the other one
    assert rides["r2"]["restaurant_drivers"] == [{"name": "Zoe", "seats": 3, "passengers": ["Zoe"]}]
    assert db["meals"][0]["participants"] == ["Zoe"]
    assert db["event_days"][0]["participants"] == []
    assert db["hotel_rooms"][0]["occupants"] == ["Zoe"]


def test_deactivating_one_member_takes_them_off_every_list(env):
    fake, client, dms = env
    r = client.put("/api/admin/users/s", json={"is_active": False})
    assert r.status_code == 204, r.text
    _assert_sam_is_gone(fake.db)
    assert dms == ["d-sam"]


def test_deactivating_in_bulk_does_the_same(env):
    fake, client, dms = env
    r = client.post("/api/admin/users/bulk-deactivate", json={"user_ids": ["s"]})
    assert r.status_code == 204, r.text
    assert next(p for p in fake.db["profiles"] if p["id"] == "s")["is_active"] is False
    _assert_sam_is_gone(fake.db)
    assert dms == ["d-sam"]


def test_deactivating_someone_already_inactive_does_not_message_them_again(env):
    fake, client, dms = env
    next(p for p in fake.db["profiles"] if p["id"] == "s")["is_active"] = False
    client.post("/api/admin/users/bulk-deactivate", json={"user_ids": ["s"]})
    assert dms == []
