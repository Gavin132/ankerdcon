"""Editing a hotel room: every member may (also to put other members in it), a read-only member may not, and
only an admin may delete one. Run through real requests so the permission checks are the real ones."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import app.dependencies as deps
from app.core import atomic
from app.routers import admin, calendar
from app.services import hotel_rooms
from app.routes import AdminRoutes, CalendarRoutes
from tests.test_atomic import Table, _Query, _Result


class _InQuery(_Query):
    """The atomic test table plus the `in_` filter the member lookup uses, and delete."""

    def in_(self, col, values):
        self.conds.append((col, "in", values))
        return self

    def delete(self):
        self.op = "delete"
        return self

    def insert(self, payload):
        self.op, self.payload = "insert", payload
        return self

    def _match(self, row):
        rest = []
        for cond in self.conds:
            if cond[1] == "in":
                if row.get(cond[0]) not in cond[2]:
                    return False
            else:
                rest.append(cond)
        # a plain equality on a text column (event_id): the atomic test table only knows array columns and ids
        plain = [c for c in rest if c[1] == "eq" and c[0] != "id" and isinstance(row.get(c[0]), str)]
        if any(row.get(c[0]) != c[2] for c in plain):
            return False
        rest = [c for c in rest if c not in plain]
        saved, self.conds = self.conds, rest
        try:
            return super()._match(row)
        finally:
            self.conds = saved

    def execute(self):
        if self.op == "insert":
            row = {"id": f"new{len(self.t.rows) + 1}", **self.payload}
            self.t.rows[row["id"]] = row
            return _Result([dict(row)])
        if self.op == "delete":
            for row_id in [i for i, r in self.t.rows.items() if self._match(r)]:
                del self.t.rows[row_id]
            return _Result([])
        return super().execute()


class _Db:
    def __init__(self, tables):
        self.tables = {name: Table(rows) for name, rows in tables.items()}

    def table(self, name):
        return _InQuery(self.tables[name])


ROOM = {"id": "r1", "event_id": "trip1", "room_number": "214", "floor": "2", "instructions": "Lift A", "capacity": 2, "occupants": ["Sam"]}
PROFILES = [{"id": "p-sam", "name": "Sam"}, {"id": "p-alex", "name": "Alex"}, {"id": "p-robin", "name": "Robin"}]


@pytest.fixture
def make(monkeypatch):
    """A client signed in as `who`; returns (client, db)."""

    def build(who="Sam", admin_user=False, viewer=False, room=None):
        db = _Db({"hotel_rooms": [dict(room or ROOM)], "profiles": [dict(p) for p in PROFILES]})
        for module in (atomic, calendar, admin, deps, hotel_rooms):
            monkeypatch.setattr(module, "supabase", db)
        monkeypatch.setattr(calendar, "_hotel_group_key", lambda event_id: ("trip1", True))
        monkeypatch.setattr(admin, "_hotel_group_key", lambda event_id: ("trip1", True))
        monkeypatch.setattr(deps, "_authenticate", lambda credentials, settings: who)
        monkeypatch.setattr(deps, "_is_viewer", lambda name: viewer)
        monkeypatch.setattr(deps, "_is_admin", lambda name: admin_user)
        app = FastAPI()
        app.include_router(calendar.router, prefix="/api")
        app.include_router(admin.router, prefix="/api")
        return TestClient(app), db

    return build


AUTH = {"Authorization": "Bearer x"}
ROOM_URL = "/api" + CalendarRoutes.PREFIX + CalendarRoutes.HOTEL_ROOM.format(event_id="day1", room_id="r1")
ADMIN_ROOM_URL = "/api" + AdminRoutes.PREFIX + AdminRoutes.EVENT_HOTEL_ROOM.format(event_id="day1", room_id="r1")


def _room(db):
    return db.tables["hotel_rooms"].rows["r1"]


def test_a_member_may_edit_a_room_and_put_another_member_in_it(make):
    client, db = make("Robin")
    response = client.put(ROOM_URL, headers=AUTH, json={"room_number": "301", "occupants": ["Sam", "Alex"]})
    assert response.status_code == 200
    assert _room(db)["room_number"] == "301"
    assert _room(db)["occupants"] == ["Sam", "Alex"]
    assert _room(db)["floor"] == "2"  # left out, so kept


def test_a_member_may_take_someone_else_out_of_a_room(make):
    client, db = make("Robin")
    assert client.put(ROOM_URL, headers=AUTH, json={"occupants": []}).status_code == 200
    assert _room(db)["occupants"] == []


def test_a_null_clears_a_field_but_a_missing_one_keeps_it(make):
    """The room form relies on this: null clears the room number, leaving it out keeps it."""
    client, db = make("Sam")
    assert client.put(ROOM_URL, headers=AUTH, json={"room_number": None, "capacity": None}).status_code == 200
    assert _room(db)["room_number"] is None and _room(db)["capacity"] is None
    assert _room(db)["floor"] == "2" and _room(db)["instructions"] == "Lift A" and _room(db)["occupants"] == ["Sam"]


def test_a_read_only_member_may_not_edit_a_room(make):
    client, db = make("Kijker", viewer=True)
    response = client.put(ROOM_URL, headers=AUTH, json={"occupants": ["Kijker"]})
    assert response.status_code == 403
    assert "alleen-lezen" in response.json()["detail"]
    assert _room(db) == ROOM


def test_a_made_up_name_is_refused(make):
    client, db = make("Sam")
    response = client.put(ROOM_URL, headers=AUTH, json={"occupants": ["Sam", "Iemand Verzonnen"]})
    assert response.status_code == 400
    assert "Iemand Verzonnen" in response.json()["detail"]
    assert _room(db)["occupants"] == ["Sam"]


def test_a_name_already_in_the_room_stays_even_when_no_profile_has_it_any_more(make):
    """Someone renamed or removed can still be left in place while the others are saved."""
    client, db = make("Sam", room={**ROOM, "occupants": ["Oud Naam"]})
    assert client.put(ROOM_URL, headers=AUTH, json={"room_number": "9", "occupants": ["Oud Naam", "Alex"]}).status_code == 200
    assert _room(db)["occupants"] == ["Oud Naam", "Alex"]


def test_a_room_cannot_get_more_people_than_its_capacity(make):
    client, db = make("Sam")
    assert client.put(ROOM_URL, headers=AUTH, json={"occupants": ["Sam", "Alex", "Robin"]}).status_code == 400
    assert _room(db)["occupants"] == ["Sam"]
    # Nor can the capacity drop below the people in it; a bigger one with more people works.
    assert client.put(ROOM_URL, headers=AUTH, json={"capacity": 1, "occupants": ["Sam", "Alex"]}).status_code == 400
    assert client.put(ROOM_URL, headers=AUTH, json={"capacity": 3, "occupants": ["Sam", "Alex", "Robin"]}).status_code == 200
    assert client.put(ROOM_URL, headers=AUTH, json={"capacity": 2}).status_code == 400
    assert _room(db)["capacity"] == 3


def test_the_same_name_twice_counts_once(make):
    client, db = make("Sam")
    assert client.put(ROOM_URL, headers=AUTH, json={"occupants": ["Alex", "Alex"]}).status_code == 200
    assert _room(db)["occupants"] == ["Alex"]


def test_a_room_of_another_trip_or_a_missing_one_is_not_found(make):
    client, _ = make("Sam", room={**ROOM, "event_id": "other-trip"})
    assert client.put(ROOM_URL, headers=AUTH, json={"room_number": "1"}).status_code == 404
    client, _ = make("Sam")
    assert client.put(ROOM_URL.replace("r1", "nope"), headers=AUTH, json={"room_number": "1"}).status_code == 404


def test_an_admin_may_still_edit(make):
    client, db = make("Beheer", admin_user=True)
    assert client.put(ROOM_URL, headers=AUTH, json={"floor": "5", "occupants": ["Alex"]}).status_code == 200
    assert _room(db)["floor"] == "5"


def test_only_an_admin_may_delete_a_room(make):
    client, db = make("Sam")
    assert client.delete(ADMIN_ROOM_URL, headers=AUTH).status_code == 403
    assert "r1" in db.tables["hotel_rooms"].rows
    client, db = make("Beheer", admin_user=True)
    assert client.delete(ADMIN_ROOM_URL, headers=AUTH).status_code == 204
    assert "r1" not in db.tables["hotel_rooms"].rows


def test_the_admin_edit_route_is_gone(make):
    """Editing is one route for everyone; there is no second, admin-only one to keep in step."""
    client, _ = make("Beheer", admin_user=True)
    assert client.put(ADMIN_ROOM_URL, headers=AUTH, json={"floor": "5"}).status_code == 405
