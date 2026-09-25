"""Admin CDN delete: the file goes, and so does everything that pointed at it."""
import pytest
from fastapi import HTTPException

from app.routers import admin

URL = "https://cdn.test/story-photos/cosplay/abc.jpg"
KEY = "cosplay/abc.jpg"


class _Result:
    def __init__(self, data):
        self.data = data


class FakeSupabase:
    """Records what is done to each table; `rows` answers the selects."""

    def __init__(self, rows=None):
        self.rows, self.calls = rows or {}, []

    def table(self, name):
        return _Table(self, name)


class _Table:
    def __init__(self, db, name):
        self.db, self.name, self.op, self.args = db, name, "select", {}

    def select(self, *_):
        return self

    def delete(self):
        self.op = "delete"
        return self

    def update(self, payload):
        self.op, self.args["payload"] = "update", payload
        return self

    def eq(self, col, val):
        self.args[col] = val
        return self

    def overlaps(self, col, val):
        self.args[col] = val
        return self

    def execute(self):
        if self.op != "select":
            self.db.calls.append((self.name, self.op, dict(self.args)))
            return _Result([])
        return _Result(self.db.rows.get(self.name, []))


@pytest.fixture
def env(monkeypatch):
    removed = []
    monkeypatch.setattr(admin.minio_client, "public_url", lambda key: f"https://cdn.test/story-photos/{key}")
    monkeypatch.setattr(admin.minio_client, "delete_object", lambda key: removed.append(key))
    return removed


def _use(monkeypatch, rows=None):
    db = FakeSupabase(rows)
    monkeypatch.setattr(admin, "supabase", db)
    return db


def test_deleting_removes_the_file_and_its_references(monkeypatch, env):
    db = _use(monkeypatch, {"cosplays": [{"id": "c1", "inspo_images": [URL, "https://other/x.jpg"]}]})
    admin.admin_delete_cdn_file(key=KEY, admin="Sam")
    assert env == [KEY]
    assert ("story_photos", "delete", {"image_url": URL}) in db.calls
    assert any(c[0] == "events" and c[2]["payload"] == {"image_url": None} for c in db.calls)
    assert any(c[0] == "profiles" and c[2]["banner_url"] == URL for c in db.calls)
    cosplay = next(c for c in db.calls if c[0] == "cosplays")
    assert cosplay[2]["payload"] == {"inspo_images": ["https://other/x.jpg"]}


def test_a_badge_image_in_use_is_refused_and_kept(monkeypatch, env):
    db = _use(monkeypatch, {"badges": [{"name": "Veteraan"}]})
    with pytest.raises(HTTPException) as e:
        admin.admin_delete_cdn_file(key="badges/x.png", admin="Sam")
    assert e.value.status_code == 409 and "Veteraan" in e.value.detail
    assert env == [] and db.calls == []


@pytest.mark.parametrize("key", ["../secrets", "/abs", "a/../b"])
def test_path_tricks_are_refused(monkeypatch, env, key):
    _use(monkeypatch)
    with pytest.raises(HTTPException) as e:
        admin.admin_delete_cdn_file(key=key, admin="Sam")
    assert e.value.status_code == 400 and env == []


def test_a_failed_cleanup_keeps_the_file(monkeypatch, env):
    class Broken(FakeSupabase):
        def table(self, name):
            raise RuntimeError("db down")

    monkeypatch.setattr(admin, "supabase", Broken())
    with pytest.raises(HTTPException) as e:
        admin.admin_delete_cdn_file(key=KEY, admin="Sam")
    assert e.value.status_code == 503 and env == []
