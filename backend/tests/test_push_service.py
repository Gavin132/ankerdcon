"""Web push: fire-and-forget, self-cleaning on a dead subscription, and never
sends anything when it isn't configured."""
import json

import pytest

from app.config import Settings
from app.services import push_service
from app.services.push_service import WebPushException, headline, send_push


def _settings(**overrides) -> Settings:
    base = {"vapid_public_key": "pub", "vapid_private_key": "priv", "vapid_subject": "mailto:a@b.com"}
    base.update(overrides)
    return Settings(**base)


class _Result:
    def __init__(self, data):
        self.data = data


class FakeSupabase:
    def __init__(self, subs):
        self.subs, self.deleted = subs, []

    def table(self, name):
        return self

    def select(self, *_):
        return self

    def in_(self, _col, names):
        self._match = [s for s in self.subs if s["user_name"] in names]
        return self

    def delete(self):
        self._deleting = True
        return self

    def eq(self, _col, val):
        if getattr(self, "_deleting", False):
            self.deleted.append(val)
        return self

    def execute(self):
        return _Result(self._match if hasattr(self, "_match") else [])


def _sub(id_, user, endpoint="https://push.test/x"):
    return {"id": id_, "user_name": user, "endpoint": endpoint, "p256dh": "p", "auth": "a"}


def test_does_nothing_when_no_vapid_key_configured(monkeypatch):
    calls = []
    monkeypatch.setattr(push_service, "webpush", lambda **kw: calls.append(kw))
    monkeypatch.setattr(push_service, "supabase", FakeSupabase([_sub("s1", "Sam")]))
    send_push(_settings(vapid_private_key=""), ["Sam"], "Title", "Body")
    assert calls == []


def test_sends_to_every_subscription_of_the_named_members(monkeypatch):
    calls = []
    monkeypatch.setattr(push_service, "webpush", lambda **kw: calls.append(kw))
    fake = FakeSupabase([_sub("s1", "Sam"), _sub("s2", "Sam", "https://push.test/y"), _sub("s3", "Alex")])
    monkeypatch.setattr(push_service, "supabase", fake)
    send_push(_settings(), ["Sam"], "Title", "Body")
    assert len(calls) == 2
    payload = json.loads(calls[0]["data"])
    assert payload == {"title": "Title", "body": "Body", "url": "/"}


def test_a_gone_subscription_is_deleted(monkeypatch):
    def raise_410(**kw):
        raise WebPushException("gone", response=type("R", (), {"status_code": 410})())

    monkeypatch.setattr(push_service, "webpush", raise_410)
    fake = FakeSupabase([_sub("s1", "Sam")])
    monkeypatch.setattr(push_service, "supabase", fake)
    send_push(_settings(), ["Sam"], "Title", "Body")
    assert fake.deleted == ["s1"]


def test_a_transient_failure_is_not_deleted(monkeypatch):
    def raise_500(**kw):
        raise WebPushException("oops", response=type("R", (), {"status_code": 500})())

    monkeypatch.setattr(push_service, "webpush", raise_500)
    fake = FakeSupabase([_sub("s1", "Sam")])
    monkeypatch.setattr(push_service, "supabase", fake)
    send_push(_settings(), ["Sam"], "Title", "Body")
    assert fake.deleted == []


def test_an_empty_name_list_sends_nothing(monkeypatch):
    calls = []
    monkeypatch.setattr(push_service, "webpush", lambda **kw: calls.append(kw))
    send_push(_settings(), [], "Title", "Body")
    assert calls == []


@pytest.mark.parametrize("content,expected", [
    ("📅 **Nieuw evenement: HMIA**\n📅 12-09\n\nOpen de app.", "📅 Nieuw evenement: HMIA"),
    ("Plain line\nsecond line", "Plain line"),
    ("x" * 150, "x" * 117 + "…"),
])
def test_headline_derives_a_short_plain_first_line(content, expected):
    assert headline(content) == expected
