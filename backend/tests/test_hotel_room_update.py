"""Editing a hotel room as an admin: null clears a field, leaving it out keeps it."""
from tests.test_atomic import _use


def test_an_explicit_null_clears_a_hotel_room_field_but_a_missing_one_keeps_it(monkeypatch):
    """The room form relies on this: null clears the room number, leaving it out keeps it."""
    from app.models.admin import AdminUpdateHotelRoomRequest
    from app.routers import admin

    t = _use(monkeypatch, [{"id": "h1", "room_number": "214", "capacity": 4, "floor": "2"}])
    monkeypatch.setattr(admin, "supabase", t)
    admin.admin_update_hotel_room("e1", "h1", AdminUpdateHotelRoomRequest.model_validate({"room_number": None, "capacity": None}), "admin")
    assert t.rows["h1"]["room_number"] is None and t.rows["h1"]["capacity"] is None
    assert t.rows["h1"]["floor"] == "2"
