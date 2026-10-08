"""The weather proxy (app/routers/weather.py) caches Open-Meteo responses
server-side so a burst of members opening the app at once shares one fetch
per (location, date) instead of each hitting Open-Meteo directly."""
import asyncio

import httpx

from app.routers import weather as weather_router


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload
        self.calls = 0

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


class _FakeClient:
    """Counts how many times `.get()` is actually called, so a test can
    assert the cache prevented a second real request."""
    instances: list["_FakeClient"] = []

    def __init__(self, payload):
        self.payload = payload
        self.calls = 0
        _FakeClient.instances.append(self)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False

    async def get(self, *_args, **_kwargs):
        self.calls += 1
        return _FakeResponse(self.payload)


def _patch_client(monkeypatch, payload):
    _FakeClient.instances = []
    fake_httpx = type("M", (), {
        "AsyncClient": staticmethod(lambda **_kw: _FakeClient(payload)),
        "RequestError": httpx.RequestError,
        "HTTPStatusError": httpx.HTTPStatusError,
    })
    monkeypatch.setattr(weather_router, "httpx", fake_httpx)
    return _FakeClient


def setup_function(_fn):
    # Each test starts from an empty cache, since it's a module-level dict
    # shared across the whole process (same as production).
    weather_router._cache.clear()


def test_geocode_returns_the_upstream_payload(monkeypatch):
    _patch_client(monkeypatch, {"results": [{"latitude": 52.09, "longitude": 5.12}]})
    result = asyncio.run(weather_router.geocode(name="Utrecht", _="Sam"))
    assert result == {"results": [{"latitude": 52.09, "longitude": 5.12}]}


def test_geocode_is_cached_across_calls(monkeypatch):
    fake_cls = _patch_client(monkeypatch, {"results": []})
    asyncio.run(weather_router.geocode(name="Utrecht", _="Sam"))
    asyncio.run(weather_router.geocode(name="Utrecht", _="Timo"))
    # Two different members asking for the same place within the TTL window
    # must only cause one real upstream request.
    assert sum(c.calls for c in fake_cls.instances) == 1


def test_geocode_with_a_different_name_is_a_fresh_request(monkeypatch):
    fake_cls = _patch_client(monkeypatch, {"results": []})
    asyncio.run(weather_router.geocode(name="Utrecht", _="Sam"))
    asyncio.run(weather_router.geocode(name="Amsterdam", _="Sam"))
    assert sum(c.calls for c in fake_cls.instances) == 2


def test_forecast_is_cached_per_location_and_date(monkeypatch):
    fake_cls = _patch_client(monkeypatch, {"daily": {}})
    asyncio.run(weather_router.forecast(latitude=52.09, longitude=5.12, date="2026-10-17", _="Sam"))
    asyncio.run(weather_router.forecast(latitude=52.09, longitude=5.12, date="2026-10-17", _="Timo"))
    assert sum(c.calls for c in fake_cls.instances) == 1
    asyncio.run(weather_router.forecast(latitude=52.09, longitude=5.12, date="2026-10-18", _="Sam"))
    assert sum(c.calls for c in fake_cls.instances) == 2


def test_archive_is_cached(monkeypatch):
    fake_cls = _patch_client(monkeypatch, {"daily": {}})
    asyncio.run(weather_router.archive(latitude=52.09, longitude=5.12, start_date="2016-01-01", end_date="2025-12-31", _="Sam"))
    asyncio.run(weather_router.archive(latitude=52.09, longitude=5.12, start_date="2016-01-01", end_date="2025-12-31", _="Timo"))
    assert sum(c.calls for c in fake_cls.instances) == 1


def _status_client(code):
    class _StatusClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return False

        async def get(self, url, **_kwargs):
            request = httpx.Request("GET", url)
            response = httpx.Response(code, request=request, json={"error": True, "reason": "Parameter 'start_date' is out of allowed range"})

            class _Resp:
                def raise_for_status(self_inner):
                    response.raise_for_status()

                def json(self_inner):
                    return response.json()

            return _Resp()

    return _StatusClient()


def _patch_status(monkeypatch, code):
    fake_httpx = type("M", (), {
        "AsyncClient": staticmethod(lambda **_kw: _status_client(code)),
        "RequestError": httpx.RequestError,
        "HTTPStatusError": httpx.HTTPStatusError,
    })
    monkeypatch.setattr(weather_router, "httpx", fake_httpx)


def test_a_date_beyond_the_forecast_range_is_an_empty_forecast_not_an_error(monkeypatch):
    """Open-Meteo answers 400 for a date more than ~16 days out. The card needs an empty
    forecast then, so it falls back to the climate average instead of "no weather data"."""
    _patch_status(monkeypatch, 400)
    result = asyncio.run(weather_router.forecast(latitude=52.09, longitude=5.12, date="2026-12-12", _="Sam"))
    assert result == {"daily": {}}


def test_a_bad_request_is_still_an_error_for_geocoding_and_the_archive(monkeypatch):
    from fastapi import HTTPException

    _patch_status(monkeypatch, 400)
    for call in (
        lambda: weather_router.geocode(name="Utrecht", _="Sam"),
        lambda: weather_router.archive(latitude=1.0, longitude=2.0, start_date="2016-01-01", end_date="2025-12-31", _="Sam"),
    ):
        try:
            asyncio.run(call())
            assert False, "should have raised"
        except HTTPException as e:
            assert e.status_code == 503


def test_a_server_error_on_the_forecast_is_still_a_503(monkeypatch):
    from fastapi import HTTPException

    _patch_status(monkeypatch, 500)
    try:
        asyncio.run(weather_router.forecast(latitude=52.09, longitude=5.12, date="2026-10-17", _="Sam"))
        assert False, "should have raised"
    except HTTPException as e:
        assert e.status_code == 503


def test_an_upstream_failure_becomes_a_503(monkeypatch):
    class _RaisingClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return False

        async def get(self, *_args, **_kwargs):
            raise httpx.RequestError("boom")

    fake_httpx = type("M", (), {
        "AsyncClient": staticmethod(lambda **_kw: _RaisingClient()),
        "RequestError": httpx.RequestError,
        "HTTPStatusError": httpx.HTTPStatusError,
    })
    monkeypatch.setattr(weather_router, "httpx", fake_httpx)

    from fastapi import HTTPException
    try:
        asyncio.run(weather_router.geocode(name="Nergensland", _="Sam"))
        assert False, "should have raised"
    except HTTPException as e:
        assert e.status_code == 503
