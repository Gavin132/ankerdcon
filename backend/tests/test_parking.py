"""Parking spots: one row per (trip, driver). Settable by the driver, anyone
on one of their rides for that trip (either direction), or an admin — not by
an unrelated member. `_day_ids_for_trip` handles both shapes of "trip id"
the frontend sends: a multi-day trip's parent event id, or a single-day
trip's one event_days id directly."""
from app.models.parking import SetParkingSpotRequest
from app.routers import parking as parking_router
from fastapi import HTTPException
import pytest


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

    def upsert(self, payload, on_conflict=None):
        self.op, self.payload = "upsert", payload
        self._conflict_keys = (on_conflict or "").split(",")
        return self

    def delete(self):
        self.op = "delete"
        return self

    def eq(self, col, val):
        self.filters.append(lambda r: r.get(col) == val)
        return self

    def in_(self, col, vals):
        vals = list(vals)
        self.filters.append(lambda r: r.get(col) in vals)
        return self

    def execute(self):
        if self.op == "upsert":
            match = [r for r in self.rows if all(f(r) for f in self.filters_for_conflict())]
            if match:
                match[0].update(self.payload)
                return _Result([match[0]])
            row = {"id": f"id{len(self.rows) + 1}", **self.payload}
            self.rows.append(row)
            return _Result([row])
        if self.op == "delete":
            match = [r for r in self.rows if all(f(r) for f in self.filters)]
            self.rows[:] = [r for r in self.rows if r not in match]
            return _Result(match)
        return _Result([r for r in self.rows if all(f(r) for f in self.filters)])

    def filters_for_conflict(self):
        keys = getattr(self, "_conflict_keys", [])
        return [lambda r, k=k: r.get(k) == self.payload.get(k) for k in keys]


class FakeSupabase:
    def __init__(self, event_days=None, rides=None, parking_spots=None):
        self.event_days = event_days or []
        self.rides = rides or []
        self.parking_spots = parking_spots if parking_spots is not None else []

    def table(self, name):
        return _Query({"event_days": self.event_days, "rides": self.rides, "parking_spots": self.parking_spots}[name])


def _day(id_, event_id):
    return {"id": id_, "event_id": event_id}


def _ride(driver, passengers, linked_event_id, direction="Inbound"):
    return {"driver": driver, "passengers": passengers, "linked_event_id": linked_event_id, "direction": direction}


# ── _day_ids_for_trip ────────────────────────────────────────────────────────

def test_day_ids_for_a_multiday_trip_id(monkeypatch):
    db = FakeSupabase(event_days=[_day("d1", "trip1"), _day("d2", "trip1")])
    monkeypatch.setattr(parking_router, "supabase", db)
    assert set(parking_router._day_ids_for_trip("trip1")) == {"d1", "d2"}


def test_day_ids_for_a_single_day_trip_id_falls_back_to_itself(monkeypatch):
    db = FakeSupabase(event_days=[])  # no event_days row has event_id == "d1"
    monkeypatch.setattr(parking_router, "supabase", db)
    assert parking_router._day_ids_for_trip("d1") == ["d1"]


# ── _can_manage ──────────────────────────────────────────────────────────────

def test_the_driver_can_always_manage_their_own_spot(monkeypatch):
    db = FakeSupabase()
    monkeypatch.setattr(parking_router, "supabase", db)
    monkeypatch.setattr(parking_router, "_is_admin", lambda _n: False)
    assert parking_router._can_manage("Sam", "trip1", "Sam") is True


def test_a_passenger_on_the_drivers_ride_can_manage_it(monkeypatch):
    db = FakeSupabase(
        event_days=[_day("d1", "trip1")],
        rides=[_ride("Sam", ["Timo", "Els"], "d1")],
    )
    monkeypatch.setattr(parking_router, "supabase", db)
    monkeypatch.setattr(parking_router, "_is_admin", lambda _n: False)
    assert parking_router._can_manage("Timo", "trip1", "Sam") is True


def test_an_unrelated_member_cannot_manage_it(monkeypatch):
    db = FakeSupabase(
        event_days=[_day("d1", "trip1")],
        rides=[_ride("Sam", ["Timo"], "d1")],
    )
    monkeypatch.setattr(parking_router, "supabase", db)
    monkeypatch.setattr(parking_router, "_is_admin", lambda _n: False)
    assert parking_router._can_manage("Els", "trip1", "Sam") is False


def test_an_admin_can_always_manage_it(monkeypatch):
    db = FakeSupabase()
    monkeypatch.setattr(parking_router, "supabase", db)
    monkeypatch.setattr(parking_router, "_is_admin", lambda _n: True)
    assert parking_router._can_manage("AdminUser", "trip1", "Sam") is True


def test_a_passenger_on_the_outbound_ride_can_also_manage_it(monkeypatch):
    # The driver's inbound and outbound rides are different rows; either counts.
    db = FakeSupabase(
        event_days=[_day("d1", "trip1")],
        rides=[_ride("Sam", [], "d1", "Inbound"), _ride("Sam", ["Els"], "d1", "Outbound")],
    )
    monkeypatch.setattr(parking_router, "supabase", db)
    monkeypatch.setattr(parking_router, "_is_admin", lambda _n: False)
    assert parking_router._can_manage("Els", "trip1", "Sam") is True


# ── set_parking_spot / list_parking_spots / delete_parking_spot ────────────

def test_set_parking_spot_is_refused_for_an_unrelated_member(monkeypatch):
    db = FakeSupabase(event_days=[_day("d1", "trip1")], rides=[_ride("Sam", [], "d1")])
    monkeypatch.setattr(parking_router, "supabase", db)
    monkeypatch.setattr(parking_router, "_is_admin", lambda _n: False)
    body = SetParkingSpotRequest(driver="Sam", lat=52.1, lng=5.1)
    with pytest.raises(HTTPException) as exc:
        parking_router.set_parking_spot("trip1", body, "Els")
    assert exc.value.status_code == 403


def test_set_parking_spot_upserts_on_the_same_trip_and_driver(monkeypatch):
    db = FakeSupabase()
    monkeypatch.setattr(parking_router, "supabase", db)
    body = SetParkingSpotRequest(driver="Sam", lat=52.1, lng=5.1)
    parking_router.set_parking_spot("trip1", body, "Sam")
    body2 = SetParkingSpotRequest(driver="Sam", lat=52.2, lng=5.2)
    parking_router.set_parking_spot("trip1", body2, "Sam")
    assert len(db.parking_spots) == 1
    assert db.parking_spots[0]["lat"] == 52.2


def test_list_parking_spots_only_returns_that_trips_rows(monkeypatch):
    db = FakeSupabase(parking_spots=[
        {"id": "p1", "trip_id": "trip1", "driver": "Sam", "lat": 1.0, "lng": 2.0, "placed_by": "Sam"},
        {"id": "p2", "trip_id": "trip2", "driver": "Timo", "lat": 3.0, "lng": 4.0, "placed_by": "Timo"},
    ])
    monkeypatch.setattr(parking_router, "supabase", db)
    result = parking_router.list_parking_spots("trip1", "Sam")
    assert [r["id"] for r in result] == ["p1"]


def test_delete_parking_spot_is_refused_for_an_unrelated_member(monkeypatch):
    db = FakeSupabase(
        event_days=[_day("d1", "trip1")], rides=[_ride("Sam", [], "d1")],
        parking_spots=[{"id": "p1", "trip_id": "trip1", "driver": "Sam", "lat": 1.0, "lng": 2.0, "placed_by": "Sam"}],
    )
    monkeypatch.setattr(parking_router, "supabase", db)
    monkeypatch.setattr(parking_router, "_is_admin", lambda _n: False)
    with pytest.raises(HTTPException) as exc:
        parking_router.delete_parking_spot("trip1", "Sam", "Els")
    assert exc.value.status_code == 403
    assert len(db.parking_spots) == 1


def test_delete_parking_spot_removes_it(monkeypatch):
    db = FakeSupabase(parking_spots=[{"id": "p1", "trip_id": "trip1", "driver": "Sam", "lat": 1.0, "lng": 2.0, "placed_by": "Sam"}])
    monkeypatch.setattr(parking_router, "supabase", db)
    parking_router.delete_parking_spot("trip1", "Sam", "Sam")
    assert db.parking_spots == []
