"""An event's/meal's location is geocoded server-side whenever it's saved,
so the crew map can place a pin without geocoding anything itself. A Maps
link (maps_url / location_maps_url / hotel_location_maps_url), when given,
is resolved for its own embedded coordinates and takes priority over
text-geocoding — see geocoding_service.resolve_location. On an update, only
touching one of the pair (text vs. maps_url) still has to re-resolve using
the row's *current* value for whichever one wasn't touched."""
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


# A fake resolve_location: maps_url takes priority, matching the real one's
# contract, over a small fixed set of known text/url -> coords.
_KNOWN_TEXT = {"Jaarbeurs Utrecht": (52.09, 5.12), "Van der Valk Utrecht": (52.05, 5.1)}
_KNOWN_URLS = {"https://maps.app.goo.gl/hotel": (50.88, 4.44), "https://maps.app.goo.gl/meal": (52.15, 4.49)}


async def _fake_resolve_location(text, maps_url):
    if maps_url and maps_url in _KNOWN_URLS:
        return _KNOWN_URLS[maps_url]
    if text and text in _KNOWN_TEXT:
        return _KNOWN_TEXT[text]
    return None


class _FakeSettings:
    discord_bot_token = ""


# ── meals.create_meal (member-facing) ───────────────────────────────────────

def test_create_meal_geocodes_its_location(monkeypatch):
    db = FakeSupabase()
    monkeypatch.setattr(meals_router, "supabase", db)
    monkeypatch.setattr(meals_router, "resolve_location", _fake_resolve_location)
    body = CreateMealRequest(meal_name="Pizza", time="2026-10-01T19:00", location="Jaarbeurs Utrecht")
    asyncio.run(meals_router.create_meal(body, BackgroundTasks(), current_user="Sam", settings=_FakeSettings()))
    assert db.rows[0]["location_lat"] == 52.09
    assert db.rows[0]["location_lng"] == 5.12


def test_create_meal_prefers_its_maps_url_over_the_location_text(monkeypatch):
    db = FakeSupabase()
    monkeypatch.setattr(meals_router, "supabase", db)
    monkeypatch.setattr(meals_router, "resolve_location", _fake_resolve_location)
    body = CreateMealRequest(
        meal_name="Pizza", time="2026-10-01T19:00",
        location="Jaarbeurs Utrecht", maps_url="https://maps.app.goo.gl/meal",
    )
    asyncio.run(meals_router.create_meal(body, BackgroundTasks(), current_user="Sam", settings=_FakeSettings()))
    assert db.rows[0]["location_lat"] == 52.15  # the maps_url's coords, not the text's


def test_create_meal_with_no_location_geocodes_nothing(monkeypatch):
    db = FakeSupabase()
    monkeypatch.setattr(meals_router, "supabase", db)
    monkeypatch.setattr(meals_router, "resolve_location", _fake_resolve_location)
    body = CreateMealRequest(meal_name="Pizza", time="2026-10-01T19:00")
    asyncio.run(meals_router.create_meal(body, BackgroundTasks(), current_user="Sam", settings=_FakeSettings()))
    assert db.rows[0]["location_lat"] is None
    assert db.rows[0]["location_lng"] is None


def test_create_meal_stores_its_own_maps_url(monkeypatch):
    db = FakeSupabase()
    monkeypatch.setattr(meals_router, "supabase", db)
    monkeypatch.setattr(meals_router, "resolve_location", _fake_resolve_location)
    body = CreateMealRequest(meal_name="Pizza", time="2026-10-01T19:00", maps_url="https://maps.app.goo.gl/elsewhere")
    asyncio.run(meals_router.create_meal(body, BackgroundTasks(), current_user="Sam", settings=_FakeSettings()))
    assert db.rows[0]["maps_url"] == "https://maps.app.goo.gl/elsewhere"


# ── admin.admin_create_event / admin_update_event ───────────────────────────

def test_admin_create_event_geocodes_location_and_hotel(monkeypatch):
    db = FakeSupabase()
    monkeypatch.setattr(admin_router, "supabase", db)
    monkeypatch.setattr(admin_router, "resolve_location", _fake_resolve_location)
    body = AdminCreateEventRequest(event_name="HDCC", location="Jaarbeurs Utrecht", hotel_location="Van der Valk Utrecht")
    asyncio.run(admin_router.admin_create_event(body, "admin"))
    assert db.rows[0]["location_lat"] == 52.09
    assert db.rows[0]["hotel_location_lat"] == 52.05


def test_admin_create_event_prefers_its_maps_url_over_the_location_text(monkeypatch):
    db = FakeSupabase()
    monkeypatch.setattr(admin_router, "supabase", db)
    monkeypatch.setattr(admin_router, "resolve_location", _fake_resolve_location)
    body = AdminCreateEventRequest(
        event_name="HDCC", location="Jaarbeurs Utrecht", location_maps_url="https://maps.app.goo.gl/meal",
    )
    asyncio.run(admin_router.admin_create_event(body, "admin"))
    assert db.rows[0]["location_lat"] == 52.15


def test_admin_create_event_with_an_ungeocodable_location_stores_no_coordinates(monkeypatch):
    db = FakeSupabase()
    monkeypatch.setattr(admin_router, "supabase", db)
    monkeypatch.setattr(admin_router, "resolve_location", _fake_resolve_location)
    body = AdminCreateEventRequest(event_name="HDCC", location="Nergensland")
    asyncio.run(admin_router.admin_create_event(body, "admin"))
    assert "location_lat" not in db.rows[0]


def test_admin_update_event_regeocodes_a_changed_location(monkeypatch):
    db = FakeSupabase(rows=[{"id": "e1", "location": "Old place", "location_lat": 1.0, "location_lng": 2.0}])
    monkeypatch.setattr(admin_router, "supabase", db)
    monkeypatch.setattr(admin_router, "resolve_location", _fake_resolve_location)
    body = AdminUpdateEventRequest(location="Jaarbeurs Utrecht")
    asyncio.run(admin_router.admin_update_event("e1", body, "admin"))
    assert db.rows[0]["location_lat"] == 52.09


def test_admin_update_event_stores_the_maps_url_overrides(monkeypatch):
    db = FakeSupabase(rows=[{"id": "e1"}])
    monkeypatch.setattr(admin_router, "supabase", db)
    monkeypatch.setattr(admin_router, "resolve_location", _fake_resolve_location)
    body = AdminUpdateEventRequest(
        location_maps_url="https://maps.app.goo.gl/meal", hotel_location_maps_url="https://maps.app.goo.gl/hotel",
    )
    asyncio.run(admin_router.admin_update_event("e1", body, "admin"))
    assert db.rows[0]["location_maps_url"] == "https://maps.app.goo.gl/meal"
    assert db.rows[0]["hotel_location_maps_url"] == "https://maps.app.goo.gl/hotel"
    # Setting only the maps_url (no location text in this update) still resolves a pin.
    assert db.rows[0]["location_lat"] == 52.15
    assert db.rows[0]["hotel_location_lat"] == 50.88


def test_admin_update_event_setting_only_maps_url_keeps_the_existing_location_text(monkeypatch):
    # A pin already placed from the location text; admin now adds a maps_url
    # override without touching the location field itself.
    db = FakeSupabase(rows=[{"id": "e1", "location": "Jaarbeurs Utrecht", "location_lat": 52.09, "location_lng": 5.12}])
    monkeypatch.setattr(admin_router, "supabase", db)
    monkeypatch.setattr(admin_router, "resolve_location", _fake_resolve_location)
    body = AdminUpdateEventRequest(location_maps_url="https://maps.app.goo.gl/meal")
    asyncio.run(admin_router.admin_update_event("e1", body, "admin"))
    # The new maps_url wins over the (unchanged) existing location text.
    assert db.rows[0]["location_lat"] == 52.15


def test_admin_update_event_clearing_maps_url_falls_back_to_the_existing_location_text(monkeypatch):
    # Previously resolved via maps_url; clearing it should fall back to
    # re-geocoding the still-present location text, not null the pin out.
    db = FakeSupabase(rows=[{"id": "e1", "location": "Jaarbeurs Utrecht", "location_maps_url": "https://maps.app.goo.gl/meal", "location_lat": 52.15, "location_lng": 4.49}])
    monkeypatch.setattr(admin_router, "supabase", db)
    monkeypatch.setattr(admin_router, "resolve_location", _fake_resolve_location)
    body = AdminUpdateEventRequest(location_maps_url=None)
    body.__pydantic_fields_set__.add("location_maps_url")
    asyncio.run(admin_router.admin_update_event("e1", body, "admin"))
    assert db.rows[0]["location_maps_url"] is None
    assert db.rows[0]["location_lat"] == 52.09  # fell back to geocoding "Jaarbeurs Utrecht"


def test_admin_update_event_clearing_location_clears_its_coordinates(monkeypatch):
    db = FakeSupabase(rows=[{"id": "e1", "location": "Old place", "location_lat": 1.0, "location_lng": 2.0}])
    monkeypatch.setattr(admin_router, "supabase", db)
    monkeypatch.setattr(admin_router, "resolve_location", _fake_resolve_location)
    body = AdminUpdateEventRequest(location=None)
    body.__pydantic_fields_set__.add("location")
    asyncio.run(admin_router.admin_update_event("e1", body, "admin"))
    assert db.rows[0]["location_lat"] is None
    assert db.rows[0]["location_lng"] is None


def test_admin_update_event_touching_neither_field_leaves_existing_coords_alone(monkeypatch):
    db = FakeSupabase(rows=[{"id": "e1", "location": "Jaarbeurs Utrecht", "location_lat": 52.09, "location_lng": 5.12, "event_name": "Old"}])
    monkeypatch.setattr(admin_router, "supabase", db)
    monkeypatch.setattr(admin_router, "resolve_location", _fake_resolve_location)
    body = AdminUpdateEventRequest(event_name="New name")
    asyncio.run(admin_router.admin_update_event("e1", body, "admin"))
    assert db.rows[0]["event_name"] == "New name"
    assert db.rows[0]["location_lat"] == 52.09  # untouched


# ── admin.admin_create_meal / admin_update_meal ─────────────────────────────

def test_admin_create_meal_geocodes_its_location(monkeypatch):
    db = FakeSupabase()
    monkeypatch.setattr(admin_router, "supabase", db)
    monkeypatch.setattr(admin_router, "resolve_location", _fake_resolve_location)
    body = AdminCreateMealRequest(meal_name="Pizza", time="2026-10-01T19:00", location="Jaarbeurs Utrecht")
    asyncio.run(admin_router.admin_create_meal(body, "admin"))
    assert db.rows[0]["location_lat"] == 52.09


def test_admin_update_meal_regeocodes_a_changed_location(monkeypatch):
    db = FakeSupabase(rows=[{"id": "m1", "location": "Old place", "location_lat": 1.0, "location_lng": 2.0}])
    monkeypatch.setattr(admin_router, "supabase", db)
    monkeypatch.setattr(admin_router, "resolve_location", _fake_resolve_location)
    body = AdminUpdateMealRequest(location="Jaarbeurs Utrecht")
    asyncio.run(admin_router.admin_update_meal("m1", body, "admin"))
    assert db.rows[0]["location_lat"] == 52.09


def test_admin_update_meal_setting_only_maps_url_keeps_the_existing_location_text(monkeypatch):
    db = FakeSupabase(rows=[{"id": "m1", "location": "Jaarbeurs Utrecht", "location_lat": 52.09, "location_lng": 5.12}])
    monkeypatch.setattr(admin_router, "supabase", db)
    monkeypatch.setattr(admin_router, "resolve_location", _fake_resolve_location)
    body = AdminUpdateMealRequest(maps_url="https://maps.app.goo.gl/meal")
    asyncio.run(admin_router.admin_update_meal("m1", body, "admin"))
    assert db.rows[0]["location_lat"] == 52.15
