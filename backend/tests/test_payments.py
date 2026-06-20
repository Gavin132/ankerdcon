"""Tests for the /api/payments endpoints."""


def test_list_payments(client, auth_headers):
    r = client.get("/api/payments/", headers=auth_headers)
    assert r.status_code == 200
    payments = r.json()
    assert len(payments) == 2
    payers = {p["paid_by"] for p in payments}
    assert payers == {"Alice", "Bob"}


def test_payment_fields(client, auth_headers):
    r = client.get("/api/payments/", headers=auth_headers)
    alice = next(p for p in r.json() if p["paid_by"] == "Alice")
    assert alice["amount"] == 45.0
    assert alice["description"] == "Parking"


def test_create_payment(client, auth_headers, mock_spreadsheet):
    r = client.post(
        "/api/payments/",
        headers=auth_headers,
        json={
            "paid_by": "Charlie",
            "amount": 12.50,
            "description": "Coffee run",
            "date": "2026-11-08",
        },
    )
    assert r.status_code == 201
    mock_spreadsheet.worksheet("Payments").append_row.assert_called_once()
    call_args = mock_spreadsheet.worksheet("Payments").append_row.call_args[0][0]
    assert call_args[0] == "Charlie"
    assert call_args[1] == 12.5
