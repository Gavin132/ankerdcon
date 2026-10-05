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


# ── resolve_maps_url() ───────────────────────────────────────────────────────

class _FakeUrlResponse:
    def __init__(self, url):
        self.url = url


class _FakeUrlClient:
    def __init__(self, url=None, raise_error=None):
        self._url = url
        self._raise_error = raise_error

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False

    async def get(self, *_args, **_kwargs):
        if self._raise_error:
            raise self._raise_error
        return _FakeUrlResponse(self._url)


def test_empty_url_returns_none_without_a_request(monkeypatch):
    _patch_client(monkeypatch, _FakeUrlClient())
    assert asyncio.run(svc.resolve_maps_url("  ")) is None


def test_a_direct_maps_url_with_coordinates_resolves(monkeypatch):
    final = "https://www.google.com/maps/place/Jaarbeurs/@52.0845399,5.1040766,17z/data=..."
    _patch_client(monkeypatch, _FakeUrlClient(url=final))
    assert asyncio.run(svc.resolve_maps_url("https://maps.app.goo.gl/xyz")) == (52.0845399, 5.1040766)


def test_a_consent_interstitial_is_unwrapped(monkeypatch):
    inner = "https://www.google.com/maps/place/Hotel/@50.8848505,4.4432877,17z/data=..."
    from urllib.parse import quote
    final = f"https://consent.google.com/ml?continue={quote(inner, safe='')}&gl=NL"
    _patch_client(monkeypatch, _FakeUrlClient(url=final))
    assert asyncio.run(svc.resolve_maps_url("https://maps.app.goo.gl/xyz")) == (50.8848505, 4.4432877)


def test_a_url_with_no_coordinates_returns_none(monkeypatch):
    _patch_client(monkeypatch, _FakeUrlClient(url="https://www.google.com/maps/search/pizza"))
    assert asyncio.run(svc.resolve_maps_url("https://maps.app.goo.gl/xyz")) is None


def test_a_network_error_resolving_a_url_returns_none(monkeypatch):
    _patch_client(monkeypatch, _FakeUrlClient(raise_error=httpx.RequestError("boom")))
    assert asyncio.run(svc.resolve_maps_url("https://maps.app.goo.gl/xyz")) is None


# ── resolve_location() ──────────────────────────────────────────────────────

def test_resolve_location_prefers_the_maps_url_over_the_text(monkeypatch):
    async def fake_resolve_maps_url(_url):
        return (1.0, 2.0)

    async def fake_geocode(_text):
        raise AssertionError("should not geocode when the maps_url already resolved")

    monkeypatch.setattr(svc, "resolve_maps_url", fake_resolve_maps_url)
    monkeypatch.setattr(svc, "geocode", fake_geocode)
    assert asyncio.run(svc.resolve_location("Somewhere", "https://maps.app.goo.gl/xyz")) == (1.0, 2.0)


def test_resolve_location_falls_back_to_geocoding_the_text(monkeypatch):
    async def fake_resolve_maps_url(_url):
        return None

    async def fake_geocode(text):
        return (3.0, 4.0) if text == "Somewhere" else None

    monkeypatch.setattr(svc, "resolve_maps_url", fake_resolve_maps_url)
    monkeypatch.setattr(svc, "geocode", fake_geocode)
    assert asyncio.run(svc.resolve_location("Somewhere", "https://maps.app.goo.gl/xyz")) == (3.0, 4.0)


def test_resolve_location_with_neither_returns_none(monkeypatch):
    assert asyncio.run(svc.resolve_location(None, None)) is None
