"""Custom avatar upload: replaces the Discord/Google picture, marks it custom so the
periodic resync (app/dependencies.py, _finalize_returning_user) leaves it alone, and
cleans up the file it replaces — but only when that file was itself a custom upload."""
from io import BytesIO

from PIL import Image

from app.routers import users


def _jpeg_bytes() -> bytes:
    out = BytesIO()
    Image.new("RGB", (64, 64), (10, 20, 30)).save(out, "JPEG", quality=85)
    return out.getvalue()


class _Result:
    def __init__(self, data):
        self.data = data


class _Table:
    def __init__(self, db, name):
        self.db, self.name, self.op, self.args = db, name, "select", {}

    def select(self, *_):
        return self

    def update(self, payload):
        self.op, self.args["payload"] = "update", payload
        return self

    def eq(self, col, val):
        self.args[col] = val
        return self

    def execute(self):
        if self.op == "update":
            self.db.updates.append(dict(self.args["payload"]))
            return _Result([])
        return _Result(self.db.rows)


class FakeSupabase:
    def __init__(self, rows):
        self.rows, self.updates = rows, []

    def table(self, name):
        return _Table(self, name)


def _patch(monkeypatch, rows):
    fake = FakeSupabase(rows)
    monkeypatch.setattr(users, "supabase", fake)
    monkeypatch.setattr(users.minio_client, "upload_bytes", lambda key, content, ct: f"https://cdn.test/{key}")
    removed = []
    monkeypatch.setattr(users.minio_client, "delete_object", lambda key: removed.append(key))
    monkeypatch.setattr(users.minio_client, "key_from_url", lambda url: url.split("cdn.test/", 1)[-1] if "cdn.test/" in url else None)
    return fake, removed


def test_uploading_sets_the_url_and_marks_it_custom(monkeypatch):
    fake, _ = _patch(monkeypatch, [{"id": "u1", "avatar_url": "https://cdn.discordapp.com/x.png", "avatar_custom": False}])
    result = users._store_avatar("Sam", _jpeg_bytes())
    assert result["url"].startswith("https://cdn.test/avatars/u1/")
    update = fake.updates[0]
    assert update["avatar_custom"] is True
    assert update["avatar_url"] == result["url"]


def test_replacing_a_discord_avatar_does_not_try_to_delete_it_from_minio(monkeypatch):
    _, removed = _patch(monkeypatch, [{"id": "u1", "avatar_url": "https://cdn.discordapp.com/x.png", "avatar_custom": False}])
    users._store_avatar("Sam", _jpeg_bytes())
    assert removed == []


def test_replacing_a_previous_custom_avatar_deletes_the_old_file(monkeypatch):
    _, removed = _patch(monkeypatch, [{"id": "u1", "avatar_url": "https://cdn.test/avatars/u1/old.jpg", "avatar_custom": True}])
    users._store_avatar("Sam", _jpeg_bytes())
    assert removed == ["avatars/u1/old.jpg"]


def test_deleting_a_custom_avatar_clears_it(monkeypatch):
    fake, removed = _patch(monkeypatch, [{"avatar_url": "https://cdn.test/avatars/u1/old.jpg", "avatar_custom": True}])
    users.delete_avatar("Sam")
    assert fake.updates[0] == {"avatar_url": None, "avatar_custom": False, "avatar_synced_at": None}
    assert removed == ["avatars/u1/old.jpg"]


def test_deleting_when_there_is_nothing_custom_is_a_noop(monkeypatch):
    fake, removed = _patch(monkeypatch, [{"avatar_url": "https://cdn.discordapp.com/x.png", "avatar_custom": False}])
    users.delete_avatar("Sam")
    assert fake.updates == []
    assert removed == []
