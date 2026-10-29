"""An admin deleting an activity takes the ride to its restaurant with it, like the member's own delete does."""
import pytest
from fastapi.testclient import TestClient

import main
from app.dependencies import get_admin_user, get_current_user
from app.routers import admin as admin_router
from tests.test_admin_merge import FakeSupabase


@pytest.fixture
def env(monkeypatch):
    fake = FakeSupabase()
    monkeypatch.setattr(admin_router, "supabase", fake)
    fake.db["meals"] = [{"id": "m1"}, {"id": "m2"}]
    fake.db["rides"] = [
        {"id": "r-rest", "direction": "Restaurant", "linked_meal_id": "m1"},
        {"id": "r-rest2", "direction": "Restaurant", "linked_meal_id": "m2"},
        {"id": "r-in", "direction": "Inbound", "linked_meal_id": None},
    ]
    main.app.dependency_overrides[get_current_user] = lambda: "Ada"
    main.app.dependency_overrides[get_admin_user] = lambda: "Ada"
    yield fake, TestClient(main.app)
    main.app.dependency_overrides.clear()


def test_deleting_a_meal_deletes_its_restaurant_ride(env):
    fake, client = env
    assert client.delete("/api/admin/meals/m1").status_code == 204
    assert [m["id"] for m in fake.db["meals"]] == ["m2"]
    assert {r["id"] for r in fake.db["rides"]} == {"r-rest2", "r-in"}


def test_bulk_deleting_meals_does_too(env):
    fake, client = env
    assert client.post("/api/admin/meals/bulk-delete", json={"meal_ids": ["m1", "m2"]}).status_code == 204
    assert fake.db["meals"] == []
    assert [r["id"] for r in fake.db["rides"]] == ["r-in"]
