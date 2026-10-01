"""Meal updates: only whoever created the meal, or an admin, may edit it —
not an unrelated member. Mirrors delete_meal's existing owner-or-admin check."""
import asyncio
from unittest.mock import AsyncMock

import app.dependencies as deps
from app.models.meal import UpdateMealRequest
from app.routers import meals as meals_router
from fastapi import HTTPException


class _Result:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self, rows):
        self.rows = rows
        self.op = None
        self.payload = None
        self.filters = []

    def select(self, *_):
        return self

    def update(self, payload):
        self.op, self.payload = "update", payload
        return self

    def eq(self, col, val):
        self.filters.append(lambda r: r.get(col) == val)
        return self

    def execute(self):
        match = [r for r in self.rows if all(f(r) for f in self.filters)]
        if self.op == "update":
            for r in match:
                r.update(self.payload)
        return _Result(match)


class FakeSupabase:
    def __init__(self, meals=None):
        self.meals = meals or []

    def table(self, name):
        return _Query({"meals": self.meals}[name])


def _meal(id_="m1", created_by="Sam", **extra):
    return {"id": id_, "created_by": created_by, "meal_name": "Pizza", "location": "", "maps_url": None, **extra}


def _update(monkeypatch, db, body, current_user, is_admin=False):
    monkeypatch.setattr(meals_router, "supabase", db)
    monkeypatch.setattr(deps, "_is_admin", lambda _n: is_admin)
    monkeypatch.setattr(meals_router, "resolve_location", AsyncMock(return_value=None))
    return asyncio.run(meals_router.update_meal("m1", body, current_user))


def test_the_creator_can_edit_their_own_meal(monkeypatch):
    db = FakeSupabase(meals=[_meal()])
    _update(monkeypatch, db, UpdateMealRequest(meal_name="Sushi"), "Sam")
    assert db.meals[0]["meal_name"] == "Sushi"


def test_an_admin_can_edit_someone_elses_meal(monkeypatch):
    db = FakeSupabase(meals=[_meal(created_by="Sam")])
    _update(monkeypatch, db, UpdateMealRequest(meal_name="Sushi"), "AdminUser", is_admin=True)
    assert db.meals[0]["meal_name"] == "Sushi"


def test_an_unrelated_member_is_refused(monkeypatch):
    db = FakeSupabase(meals=[_meal(created_by="Sam")])
    try:
        _update(monkeypatch, db, UpdateMealRequest(meal_name="Sushi"), "Els")
        assert False, "expected a 403"
    except HTTPException as exc:
        assert exc.status_code == 403
    assert db.meals[0]["meal_name"] == "Pizza"  # untouched


def test_editing_a_missing_meal_404s(monkeypatch):
    db = FakeSupabase(meals=[])
    try:
        _update(monkeypatch, db, UpdateMealRequest(meal_name="Sushi"), "Sam")
        assert False, "expected a 404"
    except HTTPException as exc:
        assert exc.status_code == 404


def test_location_change_triggers_a_coords_reresolve(monkeypatch):
    db = FakeSupabase(meals=[_meal()])
    monkeypatch.setattr(meals_router, "supabase", db)
    monkeypatch.setattr(deps, "_is_admin", lambda _n: False)
    resolve_mock = AsyncMock(return_value=(1.23, 4.56))
    monkeypatch.setattr(meals_router, "resolve_location", resolve_mock)
    asyncio.run(meals_router.update_meal("m1", UpdateMealRequest(location="Jaarbeurs"), "Sam"))
    resolve_mock.assert_awaited_once_with("Jaarbeurs", None)  # maps_url untouched -> current value (None)
    assert db.meals[0]["location_lat"] == 1.23
    assert db.meals[0]["location_lng"] == 4.56


def test_a_no_op_body_does_not_touch_the_row(monkeypatch):
    db = FakeSupabase(meals=[_meal()])
    original = dict(db.meals[0])
    _update(monkeypatch, db, UpdateMealRequest(), "Sam")
    assert db.meals[0] == original
