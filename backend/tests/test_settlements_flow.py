"""The settle-up endpoints end to end, against a small in-memory stand-in for
the Supabase client (only the query methods these routers use)."""
import itertools
import re

import pytest
from fastapi.testclient import TestClient

import main
from app.dependencies import get_current_user
from app.routers import expenses as expenses_router
from app.routers import settlements as settlements_router
from app.services import notification_service

_ids = itertools.count(1)


class _Result:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self, db, table):
        self.db, self.table, self.filters, self.op, self.payload, self.negate = db, table, [], "select", None, False

    # building
    def select(self, *_):
        self.op = "select"
        return self

    def insert(self, payload):
        self.op, self.payload = "insert", payload
        return self

    def update(self, payload):
        self.op, self.payload = "update", payload
        return self

    def delete(self):
        self.op = "delete"
        return self

    def _add(self, fn):
        neg, self.negate = self.negate, False
        self.filters.append((lambda r: not fn(r)) if neg else fn)
        return self

    @property
    def not_(self):
        self.negate = True
        return self

    def eq(self, col, val):
        return self._add(lambda r: r.get(col) == val)

    def neq(self, col, val):
        return self._add(lambda r: r.get(col) != val)

    def in_(self, col, vals):
        vals = list(vals)
        return self._add(lambda r: r.get(col) in vals)

    def is_(self, col, val):
        assert val == "null"
        return self._add(lambda r: r.get(col) is None)

    def or_(self, expr):
        conds = [re.fullmatch(r"(\w+)\.eq\.(.+)", c).groups() for c in expr.split(",")]
        return self._add(lambda r: any(r.get(c) == v for c, v in conds))

    def order(self, *_, **__):
        return self

    def single(self):
        self.one = True
        return self

    def execute(self):
        rows = self.db.setdefault(self.table, [])
        match = [r for r in rows if all(f(r) for f in self.filters)]
        if self.op == "insert":
            new = []
            for item in self.payload if isinstance(self.payload, list) else [self.payload]:
                row = {"id": f"id{next(_ids)}", **item}
                if self.table == "settlements":
                    row.setdefault("payment_ref", f"AFR-{len(rows) + 1:03d}")
                if self.table == "expense_shares":
                    row.setdefault("status", "pending")
                    row.setdefault("settlement_id", None)
                rows.append(row)
                new.append(row)
            return _Result(new)
        if self.op == "update":
            for r in match:
                r.update(self.payload)
            return _Result(match)
        if self.op == "delete":
            self.db[self.table] = [r for r in rows if r not in match]
            return _Result(match)
        if getattr(self, "one", False):
            return _Result(dict(match[0]) if match else None)
        return _Result([dict(r) for r in match])


class FakeSupabase:
    def __init__(self):
        self.db = {}

    def table(self, name):
        return _Query(self.db, name)


@pytest.fixture
def env(monkeypatch):
    fake = FakeSupabase()
    fake.db["profiles"] = [
        {"id": "t", "name": "Timo", "aliases": [], "is_admin": False},
        {"id": "b", "name": "Bob", "aliases": [], "is_admin": False},
        {"id": "f", "name": "Frekkel", "aliases": [], "is_admin": False},
    ]
    monkeypatch.setattr(settlements_router, "supabase", fake)
    monkeypatch.setattr(expenses_router, "supabase", fake)
    dms = []
    monkeypatch.setattr(notification_service, "send_personal_dm", lambda _t, pid, content: dms.append((pid, content)))
    monkeypatch.setattr(notification_service, "broadcast_category_dm", lambda *a: None)
    user = {"name": "Timo"}
    main.app.dependency_overrides[get_current_user] = lambda: user["name"]
    client = TestClient(main.app)
    yield fake, client, user, dms
    main.app.dependency_overrides.clear()


def add_expense(client, user, payer, amount, participants):
    user["name"] = payer
    each = round(amount / len(participants), 2)
    r = client.post("/api/expenses/", json={
        "paid_by": payer, "amount": amount, "description": "x", "date": "2026-09-25",
        "shares": [{"participant": p, "amount": each} for p in participants],
    })
    assert r.status_code == 201, r.text


def shares(fake):
    return {(s["participant"], s["amount"]): s for s in fake.db["expense_shares"]}


def test_request_pay_confirm(env):
    fake, client, user, dms = env
    add_expense(client, user, "Timo", 30, ["Timo", "Bob", "Frekkel"])  # Bob owes Timo 10
    add_expense(client, user, "Bob", 8, ["Bob", "Timo"])               # Timo owes Bob 4

    user["name"] = "Timo"
    ov = client.get("/api/settlements/").json()
    bob = next(i for i in ov["items"] if i["counterparty"] == "Bob")
    assert (bob["direction"], bob["amount"], bob["share_count"]) == ("owes_me", 6.0, 2)

    # Asking without any way to pay is refused; a bad IBAN too.
    r = client.post("/api/settlements/", json={"counterparty_id": "b", "action": "request"})
    assert r.status_code == 400
    r = client.post("/api/settlements/", json={"counterparty_id": "b", "action": "request", "iban": "NL00BANK0000000000"})
    assert r.status_code == 400
    # Timo can't claim to have paid Bob: Bob owes Timo.
    assert client.post("/api/settlements/", json={"counterparty_id": "b", "action": "paid"}).status_code == 400

    r = client.post("/api/settlements/", json={
        "counterparty_id": "b", "action": "request", "request_url": "https://tikkie.me/pay/abc",
    })
    assert r.status_code == 201, r.text
    s = r.json()
    assert (s["from_user"], s["to_user"], s["amount"], s["status"]) == ("Bob", "Timo", 6.0, "requested")
    assert dms[-1][0] == "b"
    # Both of their shares are now in it, and the per-share buttons are off.
    covered = [x for x in fake.db["expense_shares"] if x["settlement_id"] == s["id"]]
    assert len(covered) == 2
    user["name"] = "Bob"
    assert client.post(f"/api/expenses/shares/{covered[0]['id']}/claim").status_code in (403, 409)
    # A second settlement for the same pair waits for this one.
    assert client.post("/api/settlements/", json={"counterparty_id": "t", "action": "paid"}).status_code == 409
    # The pair no longer shows as open for Timo.
    user["name"] = "Timo"
    assert not any(i["counterparty"] == "Bob" for i in client.get("/api/settlements/").json()["items"])

    # Only Bob can say he paid, then only Timo can confirm.
    assert client.post(f"/api/settlements/{s['id']}/paid").status_code == 403
    user["name"] = "Bob"
    assert client.post(f"/api/settlements/{s['id']}/paid").status_code == 200
    assert all(x["status"] == "claimed" for x in covered)
    assert client.post(f"/api/settlements/{s['id']}/confirm").status_code == 403
    user["name"] = "Timo"
    assert client.post(f"/api/settlements/{s['id']}/confirm").status_code == 200
    assert all(x["status"] == "confirmed" for x in covered)
    row = fake.db["settlements"][0]
    assert row["request_url"] is None and row["iban"] is None  # bank details gone
    # Frekkel still owes Timo; nothing else is open.
    items = client.get("/api/settlements/").json()["items"]
    assert [(i["counterparty"], i["amount"]) for i in items] == [("Frekkel", 10.0)]


def test_cash_received_and_withdraw(env):
    fake, client, user, dms = env
    add_expense(client, user, "Timo", 20, ["Timo", "Frekkel"])
    user["name"] = "Frekkel"
    s = client.post("/api/settlements/", json={"counterparty_id": "t", "action": "paid"}).json()
    assert s["status"] == "claimed"
    # Timo says it never arrived: the share is open again.
    user["name"] = "Timo"
    assert client.delete(f"/api/settlements/{s['id']}").status_code == 204
    share = shares(fake)[("Frekkel", 10.0)]
    assert share["status"] == "pending" and share["settlement_id"] is None
    assert "nog niet ontvangen" in dms[-1][1]
    # Then Frekkel hands over cash.
    s = client.post("/api/settlements/", json={"counterparty_id": "f", "action": "received"}).json()
    assert s["status"] == "confirmed" and share["status"] == "confirmed"
    assert client.delete(f"/api/settlements/{s['id']}").status_code == 400


def test_expense_in_open_settlement_cannot_be_deleted(env):
    fake, client, user, _ = env
    add_expense(client, user, "Timo", 20, ["Timo", "Bob"])
    user["name"] = "Bob"
    client.post("/api/settlements/", json={"counterparty_id": "t", "action": "paid"})
    user["name"] = "Timo"
    expense_id = fake.db["expenses"][0]["id"]
    assert client.delete(f"/api/expenses/{expense_id}").status_code == 409
