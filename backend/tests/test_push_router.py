"""POST/DELETE /push/subscribe — thin wrappers over an upsert/delete by endpoint."""
from app.models.push import PushKeys, PushSubscriptionRequest, UnsubscribeRequest
from app.routers import push


class _Table:
    def __init__(self, sink):
        self.sink, self.op, self.args = sink, None, {}

    def upsert(self, row, on_conflict=None):
        self.op, self.args = "upsert", {"row": row, "on_conflict": on_conflict}
        return self

    def delete(self):
        self.op = "delete"
        return self

    def eq(self, col, val):
        self.args[col] = val
        return self

    def execute(self):
        if self.op == "upsert":
            self.sink.append(self.args)
        elif self.op == "delete":
            self.sink.append(("deleted", self.args.get("endpoint")))
        return self


def test_subscribe_upserts_on_endpoint(monkeypatch):
    calls = []
    monkeypatch.setattr(push, "supabase", type("S", (), {"table": staticmethod(lambda _n: _Table(calls))})())
    body = PushSubscriptionRequest(endpoint="https://push.test/x", keys=PushKeys(p256dh="p", auth="a"))
    push.subscribe(body, "Sam")
    assert calls == [{
        "row": {"user_name": "Sam", "endpoint": "https://push.test/x", "p256dh": "p", "auth": "a"},
        "on_conflict": "endpoint",
    }]


def test_unsubscribe_deletes_by_endpoint(monkeypatch):
    calls = []
    monkeypatch.setattr(push, "supabase", type("S", (), {"table": staticmethod(lambda _n: _Table(calls))})())
    push.unsubscribe(UnsubscribeRequest(endpoint="https://push.test/x"), "Sam")
    assert calls == [("deleted", "https://push.test/x")]
