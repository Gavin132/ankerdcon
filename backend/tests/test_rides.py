"""Tests for the /api/rides endpoints."""


def test_list_rides_returns_all(client, auth_headers):
    r = client.get("/api/rides/", headers=auth_headers)
    assert r.status_code == 200
    rides = r.json()
    assert len(rides) == 3


def test_list_rides_filter_inbound(client, auth_headers):
    r = client.get("/api/rides/?direction=Inbound", headers=auth_headers)
    assert r.status_code == 200
    rides = r.json()
    assert len(rides) == 2
    assert all(r["direction"] == "Inbound" for r in rides)


def test_list_rides_computed_fields(client, auth_headers):
    r = client.get("/api/rides/", headers=auth_headers)
    rides = {ride["driver"]: ride for ride in r.json()}

    # Alice's car: 4 seats, 1 passenger (Bob) → 3 left, not full
    alice = rides["Alice"]
    assert alice["seats_left"] == 3
    assert alice["is_full"] is False
    assert alice["is_public_transport"] is False
    assert alice["parking_info"] == "P2 level 1 spot A4"

    # PT ride: seats_left doesn't matter, is_public_transport True
    ns = rides["NS Intercity"]
    assert ns["is_public_transport"] is True

    # Bob's car: 2 seats, 2 passengers → full
    bob = rides["Bob"]
    assert bob["is_full"] is True
    assert bob["seats_left"] == 0


def test_create_ride(client, auth_headers, mock_spreadsheet):
    r = client.post(
        "/api/rides/",
        headers=auth_headers,
        json={
            "direction": "Outbound",
            "vehicle_type": "Car",
            "driver": "Charlie",
            "departure_time": "2026-11-08 17:00",
            "start_location": "Jaarbeurs Utrecht",
            "total_seats": 3,
            "parking_info": "Level B2",
            "maps_link": "",
        },
    )
    assert r.status_code == 201
    mock_spreadsheet.worksheet("Rides").append_row.assert_called_once()


def test_claim_seat_already_on_ride(client, auth_headers):
    # Bob is already a passenger on ride row 2
    r = client.post(
        "/api/rides/2/claim", headers=auth_headers, json={"user_name": "Bob"}
    )
    assert r.status_code == 400
    assert "already" in r.json()["detail"].lower()


def test_claim_seat_full_ride(client, auth_headers):
    # Bob's outbound car (row 4) is full
    r = client.post(
        "/api/rides/4/claim", headers=auth_headers, json={"user_name": "Charlie"}
    )
    assert r.status_code == 400
    assert "full" in r.json()["detail"].lower()


def test_claim_seat_not_found(client, auth_headers):
    r = client.post(
        "/api/rides/999/claim", headers=auth_headers, json={"user_name": "Alice"}
    )
    assert r.status_code == 400
    assert "not found" in r.json()["detail"].lower()
