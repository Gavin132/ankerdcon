"""An event's/meal's location is geocoded server-side whenever it's saved,
so the crew map can place a pin without geocoding anything itself. A meal's
own maps_url, when given, is stored alongside it (and used in place of the
geocoded coordinates by the frontend) — see CHANGELOG / docs/api.md."""
import asyncio

from fastapi import BackgroundTasks

from app.models.admin import AdminCreateEventRequest, AdminCreateMealRequest, AdminUpdateEventRequest, AdminUpdateMealRequest
from app.models.meal import CreateMealRequest
from app.routers import admin as admin_router
from app.routers import meals as meals_router


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

    def insert(self, payload):
        self.op, self.payload = "insert", payload
        return self

    def update(self, payload):
        self.op, self.payload = "update", payload
        return self

    def eq(self, col, val):
        self.filters.append(lambda r: r.get(col) == val)
        return self

    def execute(self):
        if self.op == "insert":
            row = {"id": "new1", **self.payload}
            self.rows.append(row)
            return _Result([row])
        if self.op == "update":
            for r in self.rows:
                if all(f(r) for f in self.filters):
                    r.update(self.payload)
            return _Result([r for r in self.rows if all(f(r) for f in self.filters)])
        return _Result(list(self.rows))


class FakeSupabase:
    def __init__(self, rows=None):
        self.rows = rows if rows is not None else []

    def table(self, _name):
        return _Query(self.rows)


async def _fake_geocode(location: str):
    return {"Jaarbeurs Utrecht": (52.09, 5.12), "Van der Valk Utrecht": (52.05, 5.1)}.get(location)


class _FakeSettings:
    discord_bot_token = ""


# ── meals.create_meal (member-facing) ───────────────────────────────────────

def test_create_meal_geocodes_its_location(monkeypatch):
    db = FakeSupabase()
    monkeypatch.setattr(meals_router, "supabase", db)
    monkeypatch.setattr(meals_router, "geocode", _fake_geocode)
    body = CreateMealRequest(meal_name="Pizza", time="2026-10-01T19:00", location="Jaarbeurs Utrecht")
    asyncio.run(meals_router.create_meal(body, BackgroundTasks(), current_user="Sam", settings=_FakeSettings()))
    assert db.rows[0]["location_lat"] == 52.09
    assert db.rows[0]["location_lng"] == 5.12


def test_create_meal_with_no_location_geocodes_nothing(monkeypatch):
    db = FakeSupabase()
    monkeypatch.setattr(meals_router, "supabase", db)
    monkeypatch.setattr(meals_router, "geocode", _fake_geocode)
    body = CreateMealRequest(meal_name="Pizza", time="2026-10-01T19:00")
    asyncio.run(meals_router.create_meal(body, BackgroundTasks(), current_user="Sam", settings=_FakeSettings()))
    assert db.rows[0]["location_lat"] is None
    assert db.rows[0]["location_lng"] is None


def test_create_meal_stores_its_own_maps_url(monkeypatch):
    db = FakeSupabase()
    monkeypatch.setattr(meals_router, "supabase", db)
    monkeypatch.setattr(meals_router, "geocode", _fake_geocode)
    body = CreateMealRequest(meal_name="Pizza", time="2026-10-01T19:00", maps_url="https://maps.google.com/?q=luigis")
    asyncio.run(meals_router.create_meal(body, BackgroundTasks(), current_user="Sam", settings=_FakeSettings()))
    assert db.rows[0]["maps_url"] == "https://maps.google.com/?q=luigis"


# ── admin.admin_create_event / admin_update_event ───────────────────────────

def test_admin_create_event_geocodes_location_and_hotel(monkeypatch):
    db = FakeSupabase()
    monkeypatch.setattr(admin_router, "supabase", db)
    monkeypatch.setattr(admin_router, "geocode", _fake_geocode)
    body = AdminCreateEventRequest(event_name="HDCC", location="Jaarbeurs Utrecht", hotel_location="Van der Valk Utrecht")
    asyncio.run(admin_router.admin_create_event(body, "admin"))
    assert db.rows[0]["location_lat"] == 52.09
    assert db.rows[0]["hotel_location_lat"] == 52.05


def test_admin_create_event_with_an_ungeocodable_location_stores_no_coordinates(monkeypatch):
    db = FakeSupabase()
    monkeypatch.setattr(admin_router, "supabase", db)
    monkeypatch.setattr(admin_router, "geocode", _fake_geocode)
    body = AdminCreateEventRequest(event_name="HDCC", location="Nergensland")
    asyncio.run(admin_router.admin_create_event(body, "admin"))
    assert "location_lat" not in db.rows[0]


def test_admin_update_event_regeocodes_a_changed_location(monkeypatch):
    db = FakeSupabase(rows=[{"id": "e1", "location": "Old place", "location_lat": 1.0, "location_lng": 2.0}])
    monkeypatch.setattr(admin_router, "supabase", db)
    monkeypatch.setattr(admin_router, "geocode", _fake_geocode)
    body = AdminUpdateEventRequest(location="Jaarbeurs Utrecht")
    asyncio.run(admin_router.admin_update_event("e1", body, "admin"))
    assert db.rows[0]["location_lat"] == 52.09
    assert db.rows[0]["location_lng"] == 5.12


def test_admin_update_event_clearing_location_clears_its_coordinates(monkeypatch):
    db = FakeSupabase(rows=[{"id": "e1", "location": "Old place", "location_lat": 1.0, "location_lng": 2.0}])
    monkeypatch.setattr(admin_router, "supabase", db)
    monkeypatch.setattr(admin_router, "geocode", _fake_geocode)
    body = AdminUpdateEventRequest(location=None)
    body.__pydantic_fields_set__.add("location")  # explicit clear, not "left out"
    asyncio.run(admin_router.admin_update_event("e1", body, "admin"))
    assert db.rows[0]["location_lat"] is None
    assert db.rows[0]["location_lng"] is None


# ── admin.admin_create_meal / admin_update_meal ─────────────────────────────

def test_admin_create_meal_geocodes_its_location(monkeypatch):
    db = FakeSupabase()
    monkeypatch.setattr(admin_router, "supabase", db)
    monkeypatch.setattr(admin_router, "geocode", _fake_geocode)
    body = AdminCreateMealRequest(meal_name="Pizza", time="2026-10-01T19:00", location="Jaarbeurs Utrecht")
    asyncio.run(admin_router.admin_create_meal(body, "admin"))
    assert db.rows[0]["location_lat"] == 52.09


def test_admin_update_meal_regeocodes_a_changed_location(monkeypatch):
    db = FakeSupabase(rows=[{"id": "m1", "location": "Old place", "location_lat": 1.0, "location_lng": 2.0}])
    monkeypatch.setattr(admin_router, "supabase", db)
    monkeypatch.setattr(admin_router, "geocode", _fake_geocode)
    body = AdminUpdateMealRequest(location="Jaarbeurs Utrecht")
    asyncio.run(admin_router.admin_update_meal("m1", body, "admin"))
    assert db.rows[0]["location_lat"] == 52.09
