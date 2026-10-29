"""A person sleeps in ONE room of a hotel: putting them in a room moves them out of the others.

Run through real requests (assign, the room form's PUT, create) so the permission checks are the real ones. A
member can be on a room under several stored names (current name, Discord username, former name), and those are
one person."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import app.dependencies as deps
from app.core import atomic
from app.routers import admin, calendar
from app.routes import CalendarRoutes
from app.services import hotel_rooms
from tests.test_hotel_room_update import _Db

PROFILES = [
    {"id": "p-sam", "name": "Sam", "discord_username": "samdraws", "aliases": ["Sammie"]},
    {"id": "p-alex", "name": "Alex", "discord_username": "alexx", "aliases": []},
    {"id": "p-robin", "name": "Robin", "discord_username": None, "aliases": ["Sam"]},  # claims "Sam" as a former name
    {"id": "p-noor", "name": "Noor", "discord_username": None, "aliases": []},
]


def _rooms():
    return [
        {"id": "r1", "event_id": "trip1", "room_number": "12", "capacity": 2, "occupants": []},
        {"id": "r2", "event_id": "trip1", "room_number": "4", "capacity": 2, "occupants": []},
        {"id": "r3", "event_id": "trip1", "room_number": None, "capacity": 3, "occupants": []},
        {"id": "x1", "event_id": "other-trip", "room_number": "99", "capacity": 2, "occupants": ["Alex"]},
    ]


@pytest.fixture
def make(monkeypatch):
    """A client signed in as `who`, with the three rooms of trip1 (`occupants` per room id) and one of another trip."""

    def build(occupants=None, who="Sam", viewer=False):
        rooms = _rooms()
        for room in rooms:
            if occupants and room["id"] in occupants:
                room["occupants"] = list(occupants[room["id"]])
        db = _Db({"hotel_rooms": rooms, "profiles": [dict(p) for p in PROFILES]})
        for module in (atomic, calendar, admin, deps, hotel_rooms):
            monkeypatch.setattr(module, "supabase", db)
        monkeypatch.setattr(calendar, "_hotel_group_key", lambda event_id: ("trip1", True))
        monkeypatch.setattr(deps, "_authenticate", lambda credentials, settings: who)
        monkeypatch.setattr(deps, "_is_viewer", lambda name: viewer)
        monkeypatch.setattr(deps, "_is_admin", lambda name: False)
        app = FastAPI()
        app.include_router(calendar.router, prefix="/api")
        return TestClient(app), db

    return build


AUTH = {"Authorization": "Bearer x"}


def _url(room_id, suffix=""):
    return "/api" + CalendarRoutes.PREFIX + CalendarRoutes.HOTEL_ROOM.format(event_id="day1", room_id=room_id) + suffix


def _assign(client, room_id, *names):
    return client.post(_url(room_id, "/assign"), headers=AUTH, json={"user_names": list(names)})


def _edit(client, room_id, occupants, **fields):
    return client.put(_url(room_id), headers=AUTH, json={"occupants": occupants, **fields})


def _occ(db, room_id):
    return db.tables["hotel_rooms"].rows[room_id]["occupants"]


# ── "Ik slaap hier" (assign) ──────────────────────────────────────────────────

def test_assign_moves_a_person_out_of_their_other_room(make):
    client, db = make({"r1": ["Sam", "Alex"]})
    response = _assign(client, "r2", "Sam")
    assert response.status_code == 200
    assert response.json() == {"moved": [{"name": "Sam", "room_id": "r1", "room_number": "12"}]}
    assert _occ(db, "r2") == ["Sam"]
    assert _occ(db, "r1") == ["Alex"]


def test_assign_to_the_room_they_are_in_changes_nothing(make):
    client, db = make({"r1": ["Sam"]})
    response = _assign(client, "r1", "Sam")
    assert response.status_code == 200 and response.json() == {"moved": []}
    assert _occ(db, "r1") == ["Sam"]


def test_assign_a_person_in_no_room_just_adds_them(make):
    client, db = make({"r1": ["Alex"]})
    response = _assign(client, "r2", "Sam")
    assert response.json() == {"moved": []}
    assert _occ(db, "r2") == ["Sam"] and _occ(db, "r1") == ["Alex"]


def test_assign_names_the_room_without_a_number_as_none(make):
    client, db = make({"r3": ["Alex"]})
    assert _assign(client, "r1", "Alex").json() == {"moved": [{"name": "Alex", "room_id": "r3", "room_number": None}]}
    assert _occ(db, "r3") == []


def test_assign_several_people_moves_each_of_them(make):
    client, db = make({"r1": ["Alex"], "r3": ["Noor"]})
    moved = _assign(client, "r2", "Alex", "Noor").json()["moved"]
    assert {(m["name"], m["room_id"]) for m in moved} == {("Alex", "r1"), ("Noor", "r3")}
    assert _occ(db, "r2") == ["Alex", "Noor"] and _occ(db, "r1") == [] and _occ(db, "r3") == []


# ── The same person under two stored names ────────────────────────────────────

def test_a_person_under_another_name_in_the_other_room_is_moved_under_both_names(make):
    """Sam is in room 12 as "samdraws" and in room 4 as "Sammie": picking Sam for room 4's neighbour takes both out."""
    client, db = make({"r1": ["samdraws", "Alex"], "r2": ["Sammie"]})
    response = _assign(client, "r3", "Sam")
    assert response.status_code == 200
    assert _occ(db, "r3") == ["Sam"]
    assert _occ(db, "r1") == ["Alex"] and _occ(db, "r2") == []
    assert sorted(m["room_id"] for m in response.json()["moved"]) == ["r1", "r2"]
    assert {m["name"] for m in response.json()["moved"]} == {"Sam"}


def test_someone_on_a_room_by_their_discord_username_is_moved_when_picked_by_name(make):
    client, db = make({"r1": ["samdraws"]})
    assert _assign(client, "r2", "Sam").json()["moved"] == [{"name": "Sam", "room_id": "r1", "room_number": "12"}]
    assert _occ(db, "r2") == ["Sam"] and _occ(db, "r1") == []


def test_adding_a_person_already_in_the_room_under_another_name_adds_no_second_entry(make):
    client, db = make({"r1": ["samdraws"]})
    response = _assign(client, "r1", "Sam")
    assert response.status_code == 200 and response.json() == {"moved": []}
    assert _occ(db, "r1") == ["samdraws"]


def test_the_same_name_twice_in_one_request_is_one_bed(make):
    client, db = make()
    assert _assign(client, "r1", "Sam", "Sam").status_code == 200
    assert _occ(db, "r1") == ["Sam"]


def test_a_former_name_another_member_claims_is_not_the_first_members(make):
    """Robin lists "Sam" as a former name, but "Sam" is Sam's own current name: they stay two people."""
    client, db = make({"r1": ["Robin"]})
    assert _assign(client, "r2", "Sam").json() == {"moved": []}
    assert _occ(db, "r1") == ["Robin"] and _occ(db, "r2") == ["Sam"]


# ── Capacity ──────────────────────────────────────────────────────────────────

def test_a_full_target_room_refuses_and_leaves_the_person_in_their_old_room(make):
    client, db = make({"r1": ["Sam"], "r2": ["Alex", "Noor"]})
    response = _assign(client, "r2", "Sam")
    assert response.status_code == 400 and "zit vol" in response.json()["detail"]
    assert _occ(db, "r1") == ["Sam"] and _occ(db, "r2") == ["Alex", "Noor"]


def test_the_edit_form_with_too_many_people_leaves_everyone_where_they_were(make):
    client, db = make({"r1": ["Sam"], "r2": ["Alex"]})
    response = _edit(client, "r2", ["Alex", "Sam", "Noor"])
    assert response.status_code == 400
    assert _occ(db, "r1") == ["Sam"] and _occ(db, "r2") == ["Alex"]


def test_a_person_under_two_names_takes_one_bed(make):
    client, db = make({"r2": ["samdraws", "Alex"]})  # full, but "Sam" is already in it
    assert _assign(client, "r2", "Sam").status_code == 200
    assert _occ(db, "r2") == ["samdraws", "Alex"]


# ── The room form (PUT) ───────────────────────────────────────────────────────

def test_editing_a_room_to_include_someone_from_another_room_moves_them(make):
    client, db = make({"r1": ["Sam", "Alex"], "r2": ["Noor"]})
    response = _edit(client, "r2", ["Noor", "Alex"], room_number="5")
    assert response.status_code == 200
    assert response.json() == {"moved": [{"name": "Alex", "room_id": "r1", "room_number": "12"}]}
    assert _occ(db, "r2") == ["Noor", "Alex"] and _occ(db, "r1") == ["Sam"]
    assert db.tables["hotel_rooms"].rows["r2"]["room_number"] == "5"


def test_editing_a_room_does_not_touch_rooms_of_another_trip(make):
    client, db = make({"r1": ["Sam"]})
    _edit(client, "r2", ["Alex"])
    assert _occ(db, "x1") == ["Alex"]


def test_editing_with_both_names_of_a_person_keeps_one_and_the_one_the_room_has(make):
    """A name already on the room is accepted as it is, so the form can send "Sam" next to the "samdraws" on it."""
    client, db = make({"r1": ["samdraws"]})
    assert _edit(client, "r1", ["Sam", "samdraws", "Alex"]).status_code == 200
    assert _occ(db, "r1") == ["samdraws", "Alex"]


def test_saving_the_form_again_repairs_a_person_who_is_in_two_rooms(make):
    """Rooms made before this rule can hold a person twice; putting them in one of the rooms fixes it."""
    client, db = make({"r1": ["Sam"], "r2": ["Sam", "Alex"]})
    response = _edit(client, "r1", ["Sam"])
    assert response.status_code == 200
    assert _occ(db, "r1") == ["Sam"] and _occ(db, "r2") == ["Alex"]
    assert response.json()["moved"] == [{"name": "Sam", "room_id": "r2", "room_number": "4"}]


def test_taking_people_out_of_a_room_moves_nobody(make):
    client, db = make({"r1": ["Sam", "Alex"]})
    response = _edit(client, "r1", ["Sam"])
    assert response.json() == {"moved": []} and _occ(db, "r1") == ["Sam"]


def test_the_edit_still_refuses_a_made_up_name_before_moving_anyone(make):
    client, db = make({"r1": ["Sam"]})
    response = _edit(client, "r2", ["Sam", "Iemand Verzonnen"])
    assert response.status_code == 400
    assert _occ(db, "r1") == ["Sam"] and _occ(db, "r2") == []


# ── Create, leave, permissions ────────────────────────────────────────────────

def test_creating_a_room_with_people_moves_them_out_of_their_old_room(make):
    client, db = make({"r1": ["Sam", "Alex"]})
    url = "/api" + CalendarRoutes.PREFIX + CalendarRoutes.HOTEL_ROOMS.format(event_id="day1")
    response = client.post(url, headers=AUTH, json={"room_number": "7", "capacity": 2, "occupants": ["Alex", "Alex"]})
    assert response.status_code == 201
    body = response.json()
    assert body["occupants"] == ["Alex"]
    assert body["moved"] == [{"name": "Alex", "room_id": "r1", "room_number": "12"}]
    assert _occ(db, "r1") == ["Sam"]


def test_a_read_only_member_may_not_assign(make):
    client, db = make({"r1": ["Sam"]}, who="Kijker", viewer=True)
    assert _assign(client, "r2", "Kijker").status_code == 403
    assert _occ(db, "r2") == []


def test_assign_refuses_a_made_up_name_and_a_room_of_another_trip(make):
    client, db = make({"r1": ["Sam"]})
    assert _assign(client, "r2", "Iemand Verzonnen").status_code == 400
    assert _assign(client, "x1", "Sam").status_code == 404
    assert _occ(db, "r1") == ["Sam"]


def test_leaving_still_just_takes_the_name_off(make):
    client, db = make({"r1": ["Sam", "Alex"]})
    response = client.post(_url("r1", "/leave"), headers=AUTH, json={"user_name": "Sam"})
    assert response.status_code == 204
    assert _occ(db, "r1") == ["Alex"]
