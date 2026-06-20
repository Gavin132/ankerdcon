"""Shared pytest fixtures.

The strategy is simple:
- Override FastAPI dependencies (settings, sheets) so no real network calls happen.
- Patch `app.core.sheets.get_cached_tables` to return in-memory DataFrames.
- Each test patches at the service level where needed for write operations.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.dependencies import get_sheets
from app.config import get_settings
from main import app

# ---------------------------------------------------------------------------
# Test settings — no real secrets needed
# ---------------------------------------------------------------------------
TEST_SETTINGS = Settings(
    google_service_account_json='{"type":"service_account","project_id":"test","private_key_id":"x","private_key":"x","client_email":"x@x.iam.gserviceaccount.com","client_id":"1","auth_uri":"https://x","token_uri":"https://x"}',
    google_sheet_id="test_sheet_id",
    app_passphrase="test_passphrase",
    jwt_secret_key="test_secret_key_must_be_at_least_32_characters_long",
    discord_webhook_url="",
    app_url="",
    cors_origins=["http://localhost:5173"],
)

# ---------------------------------------------------------------------------
# Static mock DataFrames — represent a small but realistic spreadsheet
# ---------------------------------------------------------------------------
MOCK_USERS = pd.DataFrame(
    [
        {
            "Name": "Alice",
            "Phone Number": "0612345678",
            "Hotel Room": "101",
            "Live Location Ping": "",
            "row_number": 2,
        },
        {
            "Name": "Bob",
            "Phone Number": "0687654321",
            "Hotel Room": "102",
            "Live Location Ping": "",
            "row_number": 3,
        },
    ]
)
MOCK_RIDES = pd.DataFrame(
    [
        {
            "Direction": "Inbound",
            "Vehicle Type": "Car",
            "Driver": "Alice",
            "Departure Time": "2026-11-08 09:00",
            "Start Location": "Amsterdam CS",
            "Total Seats": "4",
            "Passengers": "Bob",
            "Parking Info": "P2 level 1 spot A4",
            "Maps Link": "",
            "row_number": 2,
        },
        {
            "Direction": "Inbound",
            "Vehicle Type": "Public Transport",
            "Driver": "NS Intercity",
            "Departure Time": "2026-11-08 10:00",
            "Start Location": "Utrecht CS",
            "Total Seats": "99",
            "Passengers": "",
            "Parking Info": "",
            "Maps Link": "",
            "row_number": 3,
        },
        {
            "Direction": "Outbound",
            "Vehicle Type": "Car",
            "Driver": "Bob",
            "Departure Time": "2026-11-08 18:00",
            "Start Location": "Jaarbeurs Utrecht",
            "Total Seats": "2",
            "Passengers": "Alice,Bob",  # full
            "Parking Info": "",
            "Maps Link": "",
            "row_number": 4,
        },
    ]
)
MOCK_MEALS = pd.DataFrame(
    [
        {
            "Meal Name": "Ramen Night",
            "Time": "2026-11-08 19:00",
            "Location (Optional)": "Hall B",
            "Cost": "€20",
            "RSVPs": "Alice",
            "Transport Needed": "FALSE",
            "row_number": 2,
        },
        {
            "Meal Name": "Japanese BBQ",
            "Time": "2026-11-08 20:30",
            "Location (Optional)": "Yakiniku City",
            "Cost": "€35",
            "RSVPs": "",
            "Transport Needed": "TRUE",
            "row_number": 3,
        },
    ]
)
MOCK_PAYMENTS = pd.DataFrame(
    [
        {
            "Paid By": "Alice",
            "Amount": "45.00",
            "Description": "Parking",
            "Date": "2026-11-08",
            "row_number": 2,
        },
        {
            "Paid By": "Bob",
            "Amount": "30.00",
            "Description": "Lunch",
            "Date": "2026-11-08",
            "row_number": 3,
        },
    ]
)
MOCK_CALENDAR = pd.DataFrame(
    [
        {
            "Date": "2026-11-08",
            "Event ID": "HDCC2026",
            "Event Name": "Holland Dutch Comic Con",
            "Is Hotel": "TRUE",
            "Participants": "Alice,Bob",
            "row_number": 2,
        },
    ]
)
MOCK_TABLES: dict[str, pd.DataFrame] = {
    "Users": MOCK_USERS,
    "Rides": MOCK_RIDES,
    "Meals": MOCK_MEALS,
    "Payments": MOCK_PAYMENTS,
    "Calendar": MOCK_CALENDAR,
}


def _make_mock_spreadsheet() -> MagicMock:
    """A gspread.Spreadsheet mock that records write calls."""
    mock_ws = MagicMock()
    mock_ws.update_cell = MagicMock()
    mock_ws.append_row = MagicMock()
    mock_sheet = MagicMock()
    mock_sheet.worksheet = MagicMock(return_value=mock_ws)
    return mock_sheet


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def mock_spreadsheet() -> MagicMock:
    return _make_mock_spreadsheet()


@pytest.fixture()
def client(mock_spreadsheet: MagicMock, monkeypatch):
    """TestClient with settings + sheets + cache all mocked."""
    monkeypatch.setattr("app.core.sheets.get_spreadsheet", lambda _: mock_spreadsheet)
    monkeypatch.setattr("app.core.sheets.get_cached_tables", lambda _: MOCK_TABLES)

    app.dependency_overrides[get_settings] = lambda: TEST_SETTINGS
    app.dependency_overrides[get_sheets] = lambda: mock_spreadsheet

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers(client: TestClient) -> dict[str, str]:
    """Perform a login and return Authorization headers for subsequent requests."""
    r = client.post("/api/auth/login", json={"passphrase": "test_passphrase"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
