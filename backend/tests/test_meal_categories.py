"""Meal categories: new items get one, unknown ones are refused, and a category
that is still in use cannot be deleted."""
import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

import app.core.meal_categories as mc
from app.models.meal import CreateMealRequest, UpdateMealRequest
from app.models.meal_category import CreateMealCategoryRequest
from app.routers import admin as admin_router
from app.routers import meals as meals_router
import app.dependencies as deps


class _Result:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self, db, name):
        self.db, self.name = db, name
        self.op, self.payload, self.filters, self._limit = "select", None, [], None

    def select(self, *_):
        return self

    def order(self, *_):
        return self

    def limit(self, n):
        self._limit = n
        return self

    def eq(self, col, val):
        self.filters.append(lambda r: r.get(col) == val)
        return self

    def insert(self, payload):
        self.op, self.payload = "insert", payload
        return self

    def update(self, payload):
        self.op, self.payload = "update", payload
        return self

    def delete(self):
        self.op = "delete"
        return self

    def execute(self):
        rows = self.db.tables[self.name]
        if self.op == "insert":
            row = {"id": f"id{len(rows) + 1}", **self.payload}
            rows.append(row)
            return _Result([row])
        match = [r for r in rows if all(f(r) for f in self.filters)]
        if self.op == "update":
            for r in match:
                r.update(self.payload)
        elif self.op == "delete":
            for r in match:
                rows.remove(r)
        elif self._limit:
            match = match[: self._limit]
        return _Result(match)


class FakeDb:
    def __init__(self, categories=None, meals=None):
        self.tables = {"meal_categories": categories if categories is not None else [], "meals": meals or []}

    def table(self, name):
        return _Query(self, name)


def _cats():
    return [
        {"id": "eten", "name": "Eten", "sort_order": 0},
        {"id": "foto", "name": "Groepsfoto", "sort_order": 2},
    ]


def _use(monkeypatch, db):
    for module in (mc, meals_router, admin_router):
        monkeypatch.setattr(module, "supabase", db)
    monkeypatch.setattr(meals_router, "resolve_location", AsyncMock(return_value=None))
    monkeypatch.setattr(meals_router.notification_service, "broadcast_category_dm", lambda *a, **k: None)


class _Tasks:
    def add_task(self, *_a, **_k):
        pass


def _create(body, user="Sam"):
    return asyncio.run(meals_router.create_meal(body, _Tasks(), user, settings=SimpleNamespace(discord_bot_token="tok")))


def test_a_new_item_without_a_category_gets_the_first_one(monkeypatch):
    db = FakeDb(_cats())
    _use(monkeypatch, db)
    _create(CreateMealRequest(meal_name="Pizza", time="2026-11-14 19:00"))
    assert db.tables["meals"][0]["category_id"] == "eten"


def test_an_item_keeps_the_category_it_was_given(monkeypatch):
    db = FakeDb(_cats())
    _use(monkeypatch, db)
    _create(CreateMealRequest(meal_name="Groepsfoto", time="2026-11-14 10:30", category_id="foto"))
    assert db.tables["meals"][0]["category_id"] == "foto"


def test_an_unknown_category_is_refused(monkeypatch):
    db = FakeDb(_cats())
    _use(monkeypatch, db)
    with pytest.raises(HTTPException) as e:
        _create(CreateMealRequest(meal_name="Pizza", time="2026-11-14 19:00", category_id="nope"))
    assert e.value.status_code == 400
    assert db.tables["meals"] == []


def test_without_any_categories_an_item_is_still_saved(monkeypatch):
    """The migration has not run yet: planning something must not break."""
    db = FakeDb([])
    _use(monkeypatch, db)
    _create(CreateMealRequest(meal_name="Pizza", time="2026-11-14 19:00"))
    assert "category_id" not in db.tables["meals"][0]


def test_changing_to_an_unknown_category_is_refused(monkeypatch):
    db = FakeDb(_cats(), meals=[{"id": "m1", "created_by": "Sam", "category_id": "eten", "location": "", "maps_url": None}])
    _use(monkeypatch, db)
    monkeypatch.setattr(deps, "_is_admin", lambda _n: False)
    with pytest.raises(HTTPException) as e:
        asyncio.run(meals_router.update_meal("m1", UpdateMealRequest(category_id="nope"), "Sam"))
    assert e.value.status_code == 400
    assert db.tables["meals"][0]["category_id"] == "eten"


def test_a_category_in_use_cannot_be_deleted(monkeypatch):
    db = FakeDb(_cats(), meals=[{"id": "m1", "category_id": "eten"}, {"id": "m2", "category_id": "eten"}])
    _use(monkeypatch, db)
    with pytest.raises(HTTPException) as e:
        admin_router.admin_delete_meal_category("eten", "Admin")
    assert e.value.status_code == 409
    assert "2 activiteiten" in e.value.detail
    assert len(db.tables["meal_categories"]) == 2


def test_an_unused_category_can_be_deleted(monkeypatch):
    db = FakeDb(_cats(), meals=[{"id": "m1", "category_id": "eten"}])
    _use(monkeypatch, db)
    admin_router.admin_delete_meal_category("foto", "Admin")
    assert [c["id"] for c in db.tables["meal_categories"]] == ["eten"]


def test_creating_a_category_goes_last_and_names_must_differ(monkeypatch):
    db = FakeDb(_cats())
    _use(monkeypatch, db)
    made = admin_router.admin_create_meal_category(CreateMealCategoryRequest(name="  Bowlen "), "Admin")
    assert made["name"] == "Bowlen" and made["sort_order"] == 3
    with pytest.raises(HTTPException) as e:
        admin_router.admin_create_meal_category(CreateMealCategoryRequest(name="eten"), "Admin")
    assert e.value.status_code == 409


def test_listing_meals_falls_back_to_plain_rows_when_the_embed_fails(monkeypatch):
    class _Boom:
        calls = []

        def table(self, name):
            return self

        def select(self, columns):
            self.calls.append(columns)
            if "meal_categories" in columns:
                raise RuntimeError("no relationship")
            return self

        def execute(self):
            return _Result([{"id": "m1"}])

    db = _Boom()
    monkeypatch.setattr(mc, "supabase", db)
    assert mc.list_meals_with_category() == [{"id": "m1"}]
    assert db.calls[-1] == "*"
