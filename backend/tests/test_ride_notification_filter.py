"""_day_ride_eligible_names: who a new ride's notification reaches — signed
up for that event day, and not already covered by an existing ride for the
same need (the same direction that day, or the same meal for a Restaurant
ride, since there's at most one Restaurant ride per meal)."""
from app.routers import rides as rides_router


class _Result:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self, rows):
        self.rows = rows
        self.filters = []

    def select(self, *_):
        return self

    def eq(self, col, val):
        self.filters.append(lambda r: r.get(col) == val)
        return self

    def execute(self):
        return _Result([r for r in self.rows if all(f(r) for f in self.filters)])


class FakeSupabase:
    def __init__(self, event_days=None, rides=None):
        self.event_days = event_days or []
        self.rides = rides or []

    def table(self, name):
        return _Query(self.event_days if name == "event_days" else self.rides)


def _day(id_="d1", participants=None):
    return {"id": id_, "participants": participants or []}


def _ride(id_="r1", direction="Outbound", linked_event_id="d1", linked_meal_id=None,
          driver="Sam", passengers=None, restaurant_drivers=None):
    return {
        "id": id_, "direction": direction, "linked_event_id": linked_event_id,
        "linked_meal_id": linked_meal_id, "driver": driver,
        "passengers": passengers or [], "restaurant_drivers": restaurant_drivers or [],
    }


def test_no_day_link_means_no_filtering(monkeypatch):
    monkeypatch.setattr(rides_router, "supabase", FakeSupabase())
    assert rides_router._day_ride_eligible_names("Outbound", None, None, "new") is None


def test_unknown_day_means_no_filtering(monkeypatch):
    monkeypatch.setattr(rides_router, "supabase", FakeSupabase(event_days=[]))
    assert rides_router._day_ride_eligible_names("Outbound", "d1", None, "new") is None


def test_nobody_signed_up_means_nobody_eligible(monkeypatch):
    monkeypatch.setattr(rides_router, "supabase", FakeSupabase(event_days=[_day(participants=[])]))
    assert rides_router._day_ride_eligible_names("Outbound", "d1", None, "new") == set()


def test_everyone_signed_up_and_uncovered_is_eligible(monkeypatch):
    # The row for the ride just created (same id as new_ride_id) must not count
    # as "already covered" — otherwise its own driver would be excluded.
    monkeypatch.setattr(rides_router, "supabase", FakeSupabase(
        event_days=[_day(participants=["Sam", "Timo"])],
        rides=[_ride(id_="new", driver="Sam")],
    ))
    assert rides_router._day_ride_eligible_names("Outbound", "d1", None, "new") == {"Sam", "Timo"}


def test_a_member_already_driving_that_direction_that_day_is_excluded(monkeypatch):
    monkeypatch.setattr(rides_router, "supabase", FakeSupabase(
        event_days=[_day(participants=["Sam", "Timo"])],
        rides=[_ride(id_="old", direction="Outbound", driver="Timo", passengers=["Timo"])],
    ))
    assert rides_router._day_ride_eligible_names("Outbound", "d1", None, "new") == {"Sam"}


def test_a_member_already_a_passenger_that_direction_that_day_is_excluded(monkeypatch):
    monkeypatch.setattr(rides_router, "supabase", FakeSupabase(
        event_days=[_day(participants=["Sam", "Timo"])],
        rides=[_ride(id_="old", direction="Outbound", driver="Els", passengers=["Els", "Timo"])],
    ))
    assert rides_router._day_ride_eligible_names("Outbound", "d1", None, "new") == {"Sam"}


def test_a_ride_the_other_direction_does_not_exclude_anyone(monkeypatch):
    monkeypatch.setattr(rides_router, "supabase", FakeSupabase(
        event_days=[_day(participants=["Sam", "Timo"])],
        rides=[_ride(id_="old", direction="Inbound", driver="Timo", passengers=["Timo"])],
    ))
    assert rides_router._day_ride_eligible_names("Outbound", "d1", None, "new") == {"Sam", "Timo"}


def test_restaurant_rides_are_scoped_to_the_meal_not_the_day(monkeypatch):
    # Already covered for a different meal the same day does not exclude them.
    monkeypatch.setattr(rides_router, "supabase", FakeSupabase(
        event_days=[_day(participants=["Sam", "Timo"])],
        rides=[_ride(id_="old", direction="Restaurant", linked_event_id="d1", linked_meal_id="lunch",
                      driver="Timo", passengers=["Timo"])],
    ))
    assert rides_router._day_ride_eligible_names("Restaurant", "d1", "dinner", "new") == {"Sam", "Timo"}


def test_restaurant_driver_sub_passengers_are_excluded_too(monkeypatch):
    monkeypatch.setattr(rides_router, "supabase", FakeSupabase(
        event_days=[_day(participants=["Sam", "Timo", "Els"])],
        rides=[_ride(
            id_="old", direction="Restaurant", linked_event_id="d1", linked_meal_id="dinner",
            driver="Timo", passengers=[],
            restaurant_drivers=[{"name": "Timo", "seats": 4, "passengers": ["Timo", "Els"]}],
        )],
    ))
    assert rides_router._day_ride_eligible_names("Restaurant", "d1", "dinner", "new") == {"Sam"}
