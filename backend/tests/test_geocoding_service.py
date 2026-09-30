"""geocode(): turns a free-text location into (lat, lng) via Nominatim —
best-effort throughout, never raises, returns None on anything that goes
wrong so a location that can't be resolved just means no pin, never a
failed save."""
import asyncio

import httpx

from app.services import geocoding_service as svc


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


class _FakeClient:
    def __init__(self, response=None, raise_error=None):
        self._response = response
        self._raise_error = raise_error

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False

    async def get(self, *_args, **_kwargs):
        if self._raise_error:
            raise self._raise_error
        return self._response


def _patch_client(monkeypatch, client):
    monkeypatch.setattr(svc.httpx, "AsyncClient", lambda **_kwargs: client)


def test_empty_location_returns_none_without_a_request(monkeypatch):
    # A client that would blow up if actually used — this must never fire.
    _patch_client(monkeypatch, _FakeClient())
    assert asyncio.run(svc.geocode("   ")) is None


def test_a_resolved_place_returns_its_coordinates(monkeypatch):
    response = _FakeResponse([{"lat": "52.09", "lon": "5.12", "display_name": "Jaarbeurs, Utrecht"}])
    _patch_client(monkeypatch, _FakeClient(response=response))
    assert asyncio.run(svc.geocode("Jaarbeurs Utrecht")) == (52.09, 5.12)


def test_no_results_returns_none(monkeypatch):
    response = _FakeResponse([])
    _patch_client(monkeypatch, _FakeClient(response=response))
    assert asyncio.run(svc.geocode("Somewhere unresolvable")) is None


def test_a_network_error_returns_none(monkeypatch):
    _patch_client(monkeypatch, _FakeClient(raise_error=httpx.RequestError("boom")))
    assert asyncio.run(svc.geocode("Jaarbeurs Utrecht")) is None


def test_a_malformed_result_returns_none(monkeypatch):
    response = _FakeResponse([{"lat": "not-a-number", "display_name": "?"}])
    _patch_client(monkeypatch, _FakeClient(response=response))
    assert asyncio.run(svc.geocode("Jaarbeurs Utrecht")) is None
