"""Tests for the /api/auth endpoints."""


def test_login_success(client):
    r = client.post("/api/auth/login", json={"passphrase": "test_passphrase"})
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_wrong_passphrase(client):
    r = client.post("/api/auth/login", json={"passphrase": "wrong"})
    assert r.status_code == 401
    assert "Incorrect" in r.json()["detail"]


def test_protected_endpoint_without_token(client):
    r = client.get("/api/users/")
    assert r.status_code == 403  # HTTPBearer returns 403 when no credentials


def test_protected_endpoint_with_invalid_token(client):
    r = client.get("/api/users/", headers={"Authorization": "Bearer not.a.real.token"})
    assert r.status_code == 401


def test_protected_endpoint_with_valid_token(client, auth_headers):
    r = client.get("/api/users/", headers=auth_headers)
    assert r.status_code == 200


def test_refresh_without_cookie(client):
    r = client.post("/api/auth/refresh")
    assert r.status_code == 401


def test_logout(client, auth_headers):
    r = client.post("/api/auth/logout", headers=auth_headers)
    assert r.status_code == 204


def test_health_is_public(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
