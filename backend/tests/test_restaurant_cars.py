"""Seats in a restaurant ride's cars: the backend counts them, not only the button in the app."""
import pytest
from fastapi import HTTPException

from app.models.rides import RestaurantAssignRequest
from app.routers import rides
from tests.test_atomic import _use


def _cars():
    return [
        {"name": "Sam", "seats": 2, "passengers": ["Sam", "Alex"]},
        {"name": "Bo", "seats": 3, "passengers": ["Bo", "Cleo"]},
    ]


def _assign(user, driver):
    rides.assign_to_driver("r1", RestaurantAssignRequest(user_name=user, driver_name=driver), current_user=user)


def test_a_full_car_cannot_be_joined(monkeypatch):
    t = _use(monkeypatch, [{"id": "r1", "restaurant_drivers": _cars()}])
    with pytest.raises(HTTPException) as e:
        _assign("Dana", "Sam")
    assert e.value.status_code == 400 and e.value.detail == "Deze auto is vol."
    assert t.rows["r1"]["restaurant_drivers"] == _cars()


def test_two_people_cannot_take_the_last_seat_of_a_car(monkeypatch):
    t = _use(monkeypatch, [{"id": "r1", "restaurant_drivers": _cars()}])
    # Between our read and our write somebody else takes the seat that was free in Bo's car.
    t.race = lambda tt: tt.rows["r1"].update(restaurant_drivers=[
        _cars()[0], {"name": "Bo", "seats": 3, "passengers": ["Bo", "Cleo", "Eli"]},
    ])
    with pytest.raises(HTTPException) as e:
        _assign("Dana", "Bo")
    assert e.value.status_code == 400
    assert "Dana" not in t.rows["r1"]["restaurant_drivers"][1]["passengers"]


def test_moving_to_a_car_with_room_leaves_the_old_one(monkeypatch):
    t = _use(monkeypatch, [{"id": "r1", "restaurant_drivers": _cars()}])
    _assign("Alex", "Bo")
    sam, bo = t.rows["r1"]["restaurant_drivers"]
    assert sam["passengers"] == ["Sam"] and bo["passengers"] == ["Bo", "Cleo", "Alex"]


def test_choosing_the_car_you_are_already_in_changes_nothing(monkeypatch):
    t = _use(monkeypatch, [{"id": "r1", "restaurant_drivers": _cars()}])
    _assign("Alex", "Sam")  # Sam's car is full, but Alex is in it
    assert t.rows["r1"]["restaurant_drivers"] == _cars() and t.writes == 0

