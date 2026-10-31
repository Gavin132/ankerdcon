"""The ride-cost endpoints: who sees what, and who may change what."""
import pytest
from fastapi import HTTPException

from app.models.ride_cost import SetRideCostRequest
from app.routers import ride_costs as router


class _Result:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self, db, name):
        self.db, self.name = db, name
        self.op, self.payload, self.filters = "select", None, []

    def select(self, *_):
        return self

    def eq(self, col, val):
        self.filters.append(lambda r: r.get(col) == val)
        return self

    def delete(self):
        self.op = "delete"
        return self

    def update(self, payload):
        self.op, self.payload = "update", payload
        return self

    def upsert(self, payload, on_conflict=None):
        self.op, self.payload, self.conflict = "upsert", payload, on_conflict
        return self

    def execute(self):
        rows = self.db.tables[self.name]
        if self.op == "upsert":
            keys = self.conflict.split(",")
            for r in rows:
                if all(r[k] == self.payload[k] for k in keys):
                    r.update(self.payload)
                    return _Result([r])
            rows.append(dict(self.payload))
            return _Result([self.payload])
        match = [r for r in rows if all(f(r) for f in self.filters)]
        if self.op == "update":
            for r in match:
                r.update(self.payload)
        elif self.op == "delete":
            for r in match:
                rows.remove(r)
        return _Result(match)


class FakeDb:
    def __init__(self, **tables):
        self.tables = {n: [] for n in ("rides", "meals", "event_days", "events", "ride_costs")}
        self.tables.update(tables)

    def table(self, name):
        return _Query(self, name)




def _world(**extra):
    """One two-day trip: event E with days d1, d2 (the trip id is E).
    A drives B and C on the Friday Heen and B back on Sunday; D drives E and B on the Saturday Heen."""
    return FakeDb(
        event_days=[{"id": "d1", "event_id": "E"}, {"id": "d2", "event_id": "E"}],
        rides=[
            {"id": "fri", "driver": "A", "passengers": ["A", "B", "C"], "linked_event_id": "d1", "direction": "Inbound",
             "vehicle_type": "Car", "departure_time": "2026-11-21T08:00", "start_location": "Lelystad"},
            {"id": "sat", "driver": "D", "passengers": ["D", "E", "B"], "linked_event_id": "d2", "direction": "Inbound",
             "vehicle_type": "Car", "departure_time": "2026-11-22T09:00", "start_location": "Hotel"},
            {"id": "sun", "driver": "A", "passengers": ["A", "B"], "linked_event_id": "d2", "direction": "Outbound",
             "vehicle_type": "Car", "departure_time": "2026-11-22T17:00", "start_location": "Brussel Expo"},
        ],
        **extra,
    )


@pytest.fixture
def use(monkeypatch):
    def _use(db):
        monkeypatch.setattr(router, "supabase", db)
        return db
    return _use


def test_the_driver_sees_the_sheet_and_the_passenger_sees_only_their_line(use):
    use(_world(ride_costs=[{"trip_id": "E", "driver": "A", "total_amount": 90}]))
    mine = router.get_ride_costs("A")
    sheet = mine.as_driver[0]
    assert (sheet.trip_id, sheet.amount, sheet.rides, sheet.group) == ("E", 90, 2, ["B", "C"])
    assert {p.name: p.amount for p in sheet.passengers} == {"B": 30.0, "C": 30.0}
    assert sheet.own_share == 30.0 and mine.as_passenger == []

    b = router.get_ride_costs("B")
    assert b.as_driver == []
    # One line, to the driver of B's first Heen: D's Saturday Heen and A's Sunday Terug add nothing.
    assert [(l.driver, l.amount) for l in b.as_passenger] == [("A", 30.0)]
    assert [(l.driver, l.amount) for l in router.get_ride_costs("C").as_passenger] == [("A", 30.0)]
    assert router.get_ride_costs("Stranger") == router.RideCostOverview()


def test_every_driver_is_paid_by_their_own_first_heen_group(use):
    use(_world(ride_costs=[
        {"trip_id": "E", "driver": "A", "total_amount": 90},
        {"trip_id": "E", "driver": "D", "total_amount": 40},
    ]))
    d = router.get_ride_costs("D").as_driver[0]
    assert d.group == ["E"] and [(p.name, p.amount) for p in d.passengers] == [("E", 20.0)]
    assert [(l.driver, l.amount) for l in router.get_ride_costs("E").as_passenger] == [("D", 20.0)]


def test_nothing_is_owed_until_the_driver_enters_an_amount(use):
    use(_world())
    sheet = router.get_ride_costs("A").as_driver[0]
    assert sheet.amount is None and sheet.group == ["B", "C"] and sheet.passengers == []
    assert router.get_ride_costs("B").as_passenger == []


def test_an_old_row_with_parking_apart_counts_as_one_amount(use):
    use(_world(ride_costs=[{"trip_id": "E", "driver": "A", "total_amount": 60, "parking_amount": 30}]))
    assert router.get_ride_costs("A").as_driver[0].amount == 90


def test_a_trip_of_one_day_is_known_by_its_day(use):
    db = FakeDb(
        event_days=[{"id": "only-day", "event_id": "E1"}],
        rides=[{"id": "r", "driver": "A", "passengers": ["B"], "linked_event_id": "only-day", "direction": "Inbound",
                "vehicle_type": "Car", "departure_time": "2026-11-21T08:00", "start_location": "X"}],
    )
    use(db)
    assert router.get_ride_costs("A").as_driver[0].trip_id == "only-day"


def test_only_a_driver_of_the_trip_can_enter_an_amount(use):
    db = use(_world())
    with pytest.raises(HTTPException) as e:
        router.set_ride_cost("E", SetRideCostRequest(amount=50), "B")
    assert e.value.status_code == 404 and db.tables["ride_costs"] == []

    router.set_ride_cost("E", SetRideCostRequest(amount=87.5), "A")
    assert db.tables["ride_costs"][0]["total_amount"] == 87.5 and db.tables["ride_costs"][0]["parking_amount"] == 0
    router.set_ride_cost("E", SetRideCostRequest(amount=100), "A")
    assert len(db.tables["ride_costs"]) == 1 and db.tables["ride_costs"][0]["total_amount"] == 100
    router.set_ride_cost("E", SetRideCostRequest(amount=0), "A")
    assert db.tables["ride_costs"] == []
