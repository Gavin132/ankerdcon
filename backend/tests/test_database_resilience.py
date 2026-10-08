"""Slow-database protections: a dead connection is retried for reads only, the
bucket listing is reused until something changes, and requests are timed."""
import time

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import app.core.minio_client as minio_client
from app.core.http_retry import RetryOnceTransport


class _Inner(httpx.BaseTransport):
    def __init__(self, failures, error=httpx.ReadError):
        self.failures, self.error, self.calls = failures, error, 0

    def handle_request(self, request):
        self.calls += 1
        if self.calls <= self.failures:
            raise self.error("connection reset")
        return httpx.Response(200, json={"ok": True})


def _send(method, inner):
    client = httpx.Client(transport=RetryOnceTransport(inner), base_url="http://db")
    return client.request(method, "/rows")


def test_a_read_on_a_dead_connection_is_sent_again():
    inner = _Inner(failures=1)
    assert _send("GET", inner).status_code == 200
    assert inner.calls == 2


def test_a_read_that_fails_twice_gives_up():
    inner = _Inner(failures=2)
    with pytest.raises(httpx.ReadError):
        _send("GET", inner)
    assert inner.calls == 2


def test_a_write_is_never_sent_twice():
    inner = _Inner(failures=1)
    with pytest.raises(httpx.ReadError):
        _send("POST", inner)
    assert inner.calls == 1


def test_a_timeout_is_not_retried():
    """A slow answer is not a dead connection: waiting again would only double the wait."""
    inner = _Inner(failures=1, error=httpx.ReadTimeout)
    with pytest.raises(httpx.ReadTimeout):
        _send("GET", inner)
    assert inner.calls == 1


# ── bucket listing cache ─────────────────────────────────────────────────────


@pytest.fixture
def listing(monkeypatch):
    monkeypatch.setattr(minio_client, "_list_cache", None)
    calls = {"n": 0}

    def fake_list():
        calls["n"] += 1
        return [{"key": f"a{calls['n']}", "url": "u", "size": 1, "last_modified": ""}], False

    monkeypatch.setattr(minio_client, "_list_bucket", fake_list)
    return calls


def test_the_listing_is_reused_and_handed_out_as_copies(listing):
    first, _ = minio_client.list_all_objects()
    first[0]["kind"] = "mutated"
    second, _ = minio_client.list_all_objects()
    assert listing["n"] == 1
    assert "kind" not in second[0]


def test_a_change_drops_the_listing(listing):
    minio_client.list_all_objects()
    minio_client._forget_listing()
    objects, _ = minio_client.list_all_objects()
    assert listing["n"] == 2 and objects[0]["key"] == "a2"


def test_the_listing_expires(listing, monkeypatch):
    minio_client.list_all_objects()
    real = time.monotonic()
    monkeypatch.setattr(minio_client.time, "monotonic", lambda: real + minio_client._LIST_TTL_SECONDS + 1)
    minio_client.list_all_objects()
    assert listing["n"] == 2


def test_a_listing_started_before_a_change_is_not_kept(monkeypatch):
    monkeypatch.setattr(minio_client, "_list_cache", None)

    def slow_list():
        minio_client._forget_listing()  # a change lands while the bucket is being read
        return [{"key": "old"}], False

    monkeypatch.setattr(minio_client, "_list_bucket", slow_list)
    minio_client.list_all_objects()
    assert minio_client._list_cache is None


# ── request timing ───────────────────────────────────────────────────────────


def test_requests_get_a_server_timing_header_and_slow_ones_are_logged(monkeypatch, caplog):
    import main

    monkeypatch.setattr(main, "_SLOW_REQUEST_SECONDS", 0.0)
    small = FastAPI()
    small.middleware("http")(main.time_requests)

    @small.get("/api/ping")
    def ping():
        return {"ok": True}

    with caplog.at_level("WARNING"):
        response = TestClient(small).get("/api/ping")
    assert response.headers["Server-Timing"].startswith("app;dur=")
    assert any("Slow request: GET /api/ping" in r.message for r in caplog.records)
