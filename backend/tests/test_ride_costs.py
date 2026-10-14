"""Ride costs: everyone pays the driver of the first ride they took to the trip, the amount shared equally."""
from app.services.ride_costs import Leg, build_legs, compute_sheet, payers


def leg(ride_id, driver, people, direction="Inbound", departure="2026-11-21T08:00"):
    return Leg(
        ride_id=ride_id, driver=driver, direction=direction, departure_time=departure,
        start_location="X", end_location="Y", people=[driver, *[p for p in people if p != driver]],
    )


def amounts(sheet):
    return {p.name: p.amount for p in sheet.passengers}


# ── Who pays whom ────────────────────────────────────────────────────────────


def test_everyone_pays_the_driver_of_their_first_heen():
    legs = [
        leg("fri", "A", "BC"),
        leg("sat-heen", "D", "ABE", direction="Inbound", departure="2026-11-22T09:00"),
    ]
    # B and C went with A on Friday; E's first Heen is D's (Saturday). A, as driver of a Heen, pays nobody.
    assert payers(legs) == {"A": "A", "B": "A", "C": "A", "D": "D", "E": "D"}


def test_switching_cars_later_in_the_trip_changes_nothing():
    """The whole point: Saturday and Sunday in other cars do not add anyone to B's bill."""
    legs = [
        leg("fri", "A", "B", departure="2026-11-21T08:00"),
        leg("fri-hotel", "C", "B", direction="Restaurant", departure="2026-11-21T19:00"),
        leg("sat", "D", "B", direction="Outbound", departure="2026-11-22T17:00"),
        leg("mon", "E", "B", direction="Outbound", departure="2026-11-24T11:00"),
    ]
    assert payers(legs)["B"] == "A"


def test_the_first_heen_is_the_earliest_not_the_first_listed():
    legs = [leg("late", "D", "B", departure="2026-11-22T09:00"), leg("early", "A", "B", departure="2026-11-21T08:00")]
    assert payers(legs)["B"] == "A"


def test_without_a_heen_the_first_ride_as_a_passenger_counts():
    """Someone who came by train and was only picked up later pays that driver, not nobody."""
    legs = [leg("fri", "A", "C"), leg("sat", "D", "B", direction="Restaurant", departure="2026-11-22T19:00")]
    assert payers(legs)["B"] == "D"


def test_someone_who_only_ever_drove_pays_nobody():
    legs = [leg("sat", "D", "", direction="Outbound", departure="2026-11-22T17:00")]
    assert payers(legs) == {"D": "D"}


# ── The amount ───────────────────────────────────────────────────────────────


def test_the_amount_is_shared_equally_with_the_driver():
    sheet = compute_sheet("A", 120.0, ["B", "C", "D"])
    assert amounts(sheet) == {"B": 30.0, "C": 30.0, "D": 30.0}
    assert sheet.own_share == 30.0
    assert sheet.group == ["B", "C", "D"]


def test_the_driver_keeps_the_cents_that_do_not_divide():
    sheet = compute_sheet("A", 10.0, ["B", "C"])
    assert amounts(sheet) == {"B": 3.33, "C": 3.33}
    assert sheet.own_share == 3.34
    assert round((sum(amounts(sheet).values()) + sheet.own_share) * 100) == 1000


def test_a_tiny_amount_that_does_not_reach_a_cent_each_stays_with_the_driver():
    sheet = compute_sheet("A", 0.02, ["B", "C", "D"])
    assert sheet.passengers == [] and sheet.own_share == 0.02


def test_the_group_is_known_before_an_amount_is_entered():
    sheet = compute_sheet("A", None, ["B", "C"])
    assert sheet.group == ["B", "C"] and sheet.passengers == [] and sheet.own_share is None


def test_a_driver_nobody_went_with_has_nobody_to_ask():
    sheet = compute_sheet("A", 50.0, [])
    assert sheet.passengers == [] and sheet.own_share is None


def test_the_driver_and_repeats_in_the_group_are_ignored():
    sheet = compute_sheet("A", 90.0, ["A", "B", "B", "C"])
    assert amounts(sheet) == {"B": 30.0, "C": 30.0}


# ── From database rows ───────────────────────────────────────────────────────


def ride(rid, driver, passengers, direction="Inbound", day="d1", vehicle="Car", **extra):
    return {
        "id": rid, "driver": driver, "passengers": passengers, "direction": direction, "linked_event_id": day,
        "vehicle_type": vehicle, "departure_time": "2026-11-21T08:00", "start_location": "X", **extra,
    }


def test_public_transport_and_unplaced_rides_are_left_out():
    rides = [ride("a", "A", ["B"]), ride("pt", "OV", ["B"], vehicle="Public Transport"), ride("lost", "Z", ["B"], day=None)]
    legs = build_legs(rides, {}, {"d1": "trip"})
    assert [l.ride_id for l in legs["trip"]] == ["a"]


def test_every_car_to_a_restaurant_is_its_own_leg_for_its_own_driver():
    rides = [ride(
        "r", None, [], direction="Restaurant", day=None, linked_meal_id="m1",
        restaurant_drivers=[{"name": "A", "passengers": ["B"]}, {"name": "C", "passengers": ["D", "E"]}],
    )]
    legs = build_legs(rides, {"m1": {"linked_event_id": "d1"}}, {"d1": "trip"})["trip"]
    assert [(l.driver, l.people) for l in legs] == [("A", ["A", "B"]), ("C", ["C", "D", "E"])]


def test_a_ride_belongs_to_its_trip_through_its_day():
    legs = build_legs([ride("a", "A", ["B"], day="d2")], {}, {"d1": "t1", "d2": "t2"})
    assert list(legs) == ["t2"]
