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
            items = self.payload if isinstance(self.payload, list) else [self.payload]
            # Like PostgREST: a field some rows of a bulk insert leave out is sent as NULL
            # for the others, not defaulted.
            keys = {k for item in items for k in item}
            for item in items:
                row = {"id": f"id{next(_ids)}", **{k: None for k in keys}, **item}
                if self.table == "settlements":
                    row.setdefault("payment_ref", f"AFR-{len(rows) + 1:03d}")
                if self.table == "expense_shares":
                    row.setdefault("status", "pending")
                    row.setdefault("settlement_id", None)
                    assert row["status"] is not None, "null value in column status violates not-null constraint"
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


@pytest.mark.parametrize("amount, shares", [
    (10, []),                                                       # nobody to split with
    (10, [{"participant": "Bob", "amount": 4}, {"participant": "Timo", "amount": 5}]),   # 9 of 10
    (10, [{"participant": "Bob", "amount": 6}, {"participant": "Timo", "amount": 5}]),   # 11 of 10
    (10, [{"participant": "Bob", "amount": 5}, {"participant": "Bob", "amount": 5}]),    # Bob twice
    (10, [{"participant": "Bob", "amount": 10}, {"participant": "Timo", "amount": 0}]),  # zero share
    (0, [{"participant": "Bob", "amount": 0}]),                                          # no amount
])
def test_expense_split_must_be_the_whole_bill(env, amount, shares):
    fake, client, user, _ = env
    r = client.post("/api/expenses/", json={
        "paid_by": "Timo", "amount": amount, "description": "x", "date": "2026-09-25", "shares": shares,
    })
    assert r.status_code == 422
    assert not fake.db.get("expenses")


def test_uneven_split_to_the_cent_is_accepted(env):
    fake, client, user, _ = env
    r = client.post("/api/expenses/", json={
        "paid_by": "Timo", "amount": 10, "description": "x", "date": "2026-09-25",
        "shares": [{"participant": p, "amount": a} for p, a in [("Timo", 3.34), ("Bob", 3.33), ("Frekkel", 3.33)]],
    })
    assert r.status_code == 201, r.text


# ── Admin overrides and races ─────────────────────────────────────────────────

def _as_admin(monkeypatch, fake):
    from app.dependencies import get_admin_user
    from app.routers import admin as admin_router
    monkeypatch.setattr(admin_router, "supabase", fake)
    main.app.dependency_overrides[get_admin_user] = lambda: "Timo"


def test_admin_cannot_delete_an_expense_in_an_open_settlement(env, monkeypatch):
    fake, client, user, _ = env
    _as_admin(monkeypatch, fake)
    add_expense(client, user, "Timo", 20, ["Timo", "Bob"])
    user["name"] = "Bob"
    client.post("/api/settlements/", json={"counterparty_id": "t", "action": "paid"})
    expense_id = fake.db["expenses"][0]["id"]
    assert client.delete(f"/api/admin/expenses/{expense_id}").status_code == 409
    assert len(fake.db["expenses"]) == 1


def test_admin_can_delete_an_expense_that_is_not_in_a_settlement(env, monkeypatch):
    fake, client, user, _ = env
    _as_admin(monkeypatch, fake)
    add_expense(client, user, "Timo", 20, ["Timo", "Bob"])
    expense_id = fake.db["expenses"][0]["id"]
    assert client.delete(f"/api/admin/expenses/{expense_id}").status_code == 204
    assert fake.db["expenses"] == []


def test_admin_cannot_change_a_share_status_inside_an_open_settlement(env, monkeypatch):
    fake, client, user, _ = env
    _as_admin(monkeypatch, fake)
    add_expense(client, user, "Timo", 20, ["Timo", "Bob"])
    user["name"] = "Bob"
    client.post("/api/settlements/", json={"counterparty_id": "t", "action": "paid"})
    share = shares(fake)[("Bob", 10.0)]
    r = client.put(f"/api/admin/expense-shares/{share['id']}", json={"status": "pending"})
    assert r.status_code == 409 and share["status"] == "claimed"
    # A share outside any settlement stays editable.
    add_expense(client, user, "Timo", 6, ["Timo", "Frekkel"])
    free = shares(fake)[("Frekkel", 3.0)]
    assert client.put(f"/api/admin/expense-shares/{free['id']}", json={"status": "claimed"}).status_code == 204


def test_a_share_changing_underneath_a_new_settlement_undoes_it(env, monkeypatch):
    fake, client, user, _ = env
    add_expense(client, user, "Timo", 20, ["Timo", "Bob"])
    user["name"] = "Bob"
    real_update = expenses_router.supabase.table("expense_shares").__class__.update

    def sneaky(self, payload):
        # Someone confirms the share between working out the balance and attaching it.
        if self.table == "expense_shares" and payload.get("settlement_id"):
            for s in self.db["expense_shares"]:
                s["status"] = "confirmed"
        return real_update(self, payload)

    monkeypatch.setattr(type(expenses_router.supabase.table("x")), "update", sneaky)
    r = client.post("/api/settlements/", json={"counterparty_id": "t", "action": "paid"})
    assert r.status_code == 409
    assert fake.db["settlements"] == []


def test_a_duplicate_open_settlement_is_a_conflict_not_a_server_error(env, monkeypatch):
    fake, client, user, _ = env
    add_expense(client, user, "Timo", 20, ["Timo", "Bob"])
    user["name"] = "Bob"
    query_cls = type(fake.table("x"))
    real_insert = query_cls.insert

    def failing(self, payload):
        if self.table == "settlements":
            raise Exception('duplicate key value violates unique constraint "settlements_one_open_per_pair_idx" (23505)')
        return real_insert(self, payload)

    monkeypatch.setattr(query_cls, "insert", failing)
    r = client.post("/api/settlements/", json={"counterparty_id": "t", "action": "paid"})
    assert r.status_code == 409


def test_expense_with_payer_among_the_participants_saves_every_share(env):
    """Regression: the payer's share used to carry a status the others lacked,
    so the bulk insert left the others' status NULL and the database refused it."""
    fake, client, user, _ = env
    add_expense(client, user, "Timo", 30, ["Timo", "Bob", "Frekkel"])
    by_person = {s["participant"]: s for s in fake.db["expense_shares"]}
    assert by_person["Timo"]["status"] == "confirmed"
    assert by_person["Bob"]["status"] == "pending" and by_person["Frekkel"]["status"] == "pending"


def test_failed_share_insert_does_not_leave_a_bill_behind(env, monkeypatch):
    fake, client, user, _ = env
    user["name"] = "Timo"
    query_cls = type(fake.table("x"))
    real_insert = query_cls.insert

    def failing(self, payload):
        if self.table == "expense_shares":
            raise Exception("boom")
        return real_insert(self, payload)

    monkeypatch.setattr(query_cls, "insert", failing)
    r = client.post("/api/expenses/", json={
        "paid_by": "Timo", "amount": 10, "description": "x", "date": "2026-09-25",
        "shares": [{"participant": "Bob", "amount": 10}],
    })
    assert r.status_code == 503
    assert fake.db.get("expenses", []) == []
