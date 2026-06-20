"""Tests for the /api/meals endpoints."""


def test_list_meals(client, auth_headers):
    r = client.get("/api/meals/", headers=auth_headers)
    assert r.status_code == 200
    meals = r.json()
    assert len(meals) == 2


def test_meal_transport_needed_flag(client, auth_headers):
    r = client.get("/api/meals/", headers=auth_headers)
    meals = {m["meal_name"]: m for m in r.json()}

    assert meals["Ramen Night"]["transport_needed"] is False
    assert meals["Japanese BBQ"]["transport_needed"] is True


def test_meal_rsvps_parsed_as_list(client, auth_headers):
    r = client.get("/api/meals/", headers=auth_headers)
    ramen = next(m for m in r.json() if m["meal_name"] == "Ramen Night")
    assert ramen["rsvps"] == ["Alice"]


def test_create_meal(client, auth_headers, mock_spreadsheet):
    r = client.post(
        "/api/meals/",
        headers=auth_headers,
        json={
            "meal_name": "Pizza Night",
            "time": "2026-11-09 20:00",
            "location": "Piazza",
            "cost": "€18",
            "transport_needed": False,
        },
    )
    assert r.status_code == 201
    mock_spreadsheet.worksheet("Meals").append_row.assert_called_once()


def test_create_meal_with_transport_flag(client, auth_headers, mock_spreadsheet):
    r = client.post(
        "/api/meals/",
        headers=auth_headers,
        json={
            "meal_name": "Yakiniku",
            "time": "2026-11-09 19:00",
            "location": "Somewhere outside",
            "cost": "€40",
            "transport_needed": True,
        },
    )
    assert r.status_code == 201
    call_args = mock_spreadsheet.worksheet("Meals").append_row.call_args[0][0]
    assert call_args[5] == "TRUE"


def test_rsvp_already_rsvped(client, auth_headers):
    # Alice is already RSVPed for Ramen Night (row 2)
    r = client.post(
        "/api/meals/2/rsvp", headers=auth_headers, json={"user_name": "Alice"}
    )
    assert r.status_code == 400
    assert "already" in r.json()["detail"].lower()


def test_rsvp_success(client, auth_headers, mock_spreadsheet):
    # Bob is not RSVPed for Ramen Night (row 2)
    r = client.post(
        "/api/meals/2/rsvp", headers=auth_headers, json={"user_name": "Bob"}
    )
    assert r.status_code == 204
    mock_spreadsheet.worksheet("Meals").update_cell.assert_called_once()


def test_rsvp_meal_not_found(client, auth_headers):
    r = client.post(
        "/api/meals/999/rsvp", headers=auth_headers, json={"user_name": "Alice"}
    )
    assert r.status_code == 400
    assert "not found" in r.json()["detail"].lower()
