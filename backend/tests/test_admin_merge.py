"""Merging a placeholder profile into a real member (POST /admin/users/{id}/merge), end to end against a
small in-memory stand-in for the Supabase client."""
import itertools
import json
import re

import pytest
from fastapi.testclient import TestClient

import main
from app import dependencies
from app.core import atomic
from app.dependencies import get_current_user
from app.routers import admin as admin_router
from app.routers import users as users_router
from app.services import profile_merge

_ids = itertools.count(1)


class _Result:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self, db, table):
        self.db, self.table, self.filters, self.op, self.payload = db, table, [], "select", None

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

    def eq(self, col, val):
        self.filters.append(lambda r: r.get(col) == val)
        return self

    def in_(self, col, vals):
        vals = list(vals)
        self.filters.append(lambda r: r.get(col) in vals)
        return self

    def is_(self, col, val):
        assert val == "null"
        self.filters.append(lambda r: r.get(col) is None)
        return self

    def or_(self, expr):
        conds = [re.fullmatch(r"(\w+)\.eq\.(.+)", c).groups() for c in expr.split(",")]
        self.filters.append(lambda r: any(r.get(c) == v for c, v in conds))
        return self

    def filter(self, col, op, val):
        """What update_list sends: the column must still equal what was read."""
        assert op == "eq"

        def same(row):
            current = row.get(col)
            if val.startswith("{"):
                return val == atomic._text_array_literal(current or [])
            return val == json.dumps(current, separators=(",", ":"), ensure_ascii=False)

        self.filters.append(same)
        return self

    def order(self, *_, **__):
        return self

    def execute(self):
        rows = self.db.setdefault(self.table, [])
        match = [r for r in rows if all(f(r) for f in self.filters)]
        if self.op == "insert":
            row = {"id": f"id{next(_ids)}", **self.payload}
            rows.append(row)
            return _Result([row])
        if self.op == "update":
            for r in match:
                r.update(self.payload)
            return _Result([dict(r) for r in match])
        if self.op == "delete":
            self.db[self.table] = [r for r in rows if r not in match]
            return _Result(match)
        return _Result([dict(r) for r in match])


class FakeSupabase:
    def __init__(self):
        self.db = {}
        self.missing = set()   # tables that "do not exist" (their migration was never run)

    def table(self, name):
        if name in self.missing:
            raise Exception(f"PGRST205: Could not find the table 'public.{name}' in the schema cache")
        return _Query(self.db, name)


def real(id_, name, **extra):
    return {"id": id_, "name": name, "aliases": [], "badge_ids": [], "is_admin": False, "is_active": True,
            "email": f"{name.lower()}@example.com", "discord_username": None, "avatar_url": None, **extra}


def placeholder(id_, name, **extra):
    return {"id": id_, "name": name, "aliases": [], "badge_ids": [], "is_admin": False, "is_active": True,
            "email": None, "discord_username": None, "avatar_url": None, "is_first_login": True, **extra}


@pytest.fixture
def env(monkeypatch):
    fake = FakeSupabase()
    for module in (admin_router, users_router, profile_merge, atomic, dependencies):
        monkeypatch.setattr(module, "supabase", fake)
    fake.db["profiles"] = [
        real("admin", "Ada", is_admin=True),
        real("t", "Timo", aliases=["Tim"]),
        real("z", "Zoe"),
        placeholder("p", "Pip", badge_ids=["b1"]),
        placeholder("q", "Quinn"),
    ]
    user = {"name": "Ada"}
    main.app.dependency_overrides[get_current_user] = lambda: user["name"]
    client = TestClient(main.app)
    yield fake, client, user
    main.app.dependency_overrides.clear()


def merge(client, source="p", target="t", dry_run=False):
    return client.post(f"/api/admin/users/{source}/merge", json={"target_id": target, "dry_run": dry_run})


def seed(db):
    """Pip (the placeholder) is on things; Timo (the member) is on some of the same."""
    db["rides"] = [
        {"id": "r1", "driver": "Pip", "passengers": ["Pip", "Zoe"], "restaurant_drivers": []},
        {"id": "r2", "driver": "Zoe", "passengers": ["Zoe", "Pip", "Timo"], "restaurant_drivers": []},
        {"id": "r3", "driver": "Zoe", "passengers": ["Zoe"], "restaurant_drivers": []},
        {"id": "r4", "driver": "Zoe", "passengers": ["Zoe", "Pip", "Timo"], "restaurant_drivers": [
            {"name": "Zoe", "seats": 3, "passengers": ["Zoe", "Timo"]},
            {"name": "Pip", "seats": 4, "passengers": ["Pip"]},
            {"name": "Timo", "seats": 2, "passengers": ["Timo"]},
        ]},
    ]
    db["meals"] = [
        {"id": "m1", "participants": ["Pip", "Zoe"], "created_by": "Pip"},
        {"id": "m2", "participants": ["Tim", "Pip"], "created_by": "Zoe"},
        {"id": "m3", "participants": ["Zoe"], "created_by": "Zoe"},
    ]
    db["event_days"] = [{"id": "d1", "participants": ["Pip"]}, {"id": "d2", "participants": ["Zoe"]}]
    db["hotel_rooms"] = [{"id": "h1", "occupants": ["Pip", "Zoe"]}]
    db["cosplays"] = [{"id": "c1", "user_name": "Pip"}, {"id": "c2", "user_name": "Zoe"}]
    db["story_photos"] = [{"id": "s1", "uploaded_by": "Pip"}, {"id": "s2", "uploaded_by": "Pip"}]
    db["story_seen"] = [
        {"user_name": "Pip", "event_day_id": "d1", "last_seen_seq": 9},
        {"user_name": "Pip", "event_day_id": "d2", "last_seen_seq": 7},
        {"user_name": "Timo", "event_day_id": "d2", "last_seen_seq": 3},
    ]
    db["ride_costs"] = [
        {"id": "rc1", "trip_id": "T1", "driver": "Pip", "total_amount": 10},
        {"id": "rc2", "trip_id": "T2", "driver": "Pip", "total_amount": 20},
        {"id": "rc3", "trip_id": "T2", "driver": "Timo", "total_amount": 30},
    ]
    db["parking_spots"] = [
        {"id": "ps1", "trip_id": "T1", "driver": "Pip", "placed_by": "Zoe"},
        {"id": "ps2", "trip_id": "T3", "driver": "Zoe", "placed_by": "Pip"},
    ]
    db["feedback"] = [{"id": "f1", "user_name": "Pip"}]
    db["ticket_polls"] = [{"id": "tp1", "buyer": "Pip"}, {"id": "tp2", "buyer": "Zoe"}]
    db["ticket_votes"] = [
        {"id": "v1", "poll_id": "tp1", "voter": "Pip"},    # Timo voted too: Pip's goes
        {"id": "v2", "poll_id": "tp1", "voter": "Timo"},
        {"id": "v3", "poll_id": "tp2", "voter": "Pip"},    # moves
    ]
    db["push_subscriptions"] = []
    db["expenses"] = [
        {"id": "e1", "paid_by": "Pip"},      # Pip paid, Timo and Zoe owe
        {"id": "e2", "paid_by": "Zoe"},      # Zoe paid, Pip and Timo owe
        {"id": "e3", "paid_by": "Timo"},     # Timo paid, Pip owes
    ]
    db["expense_shares"] = [
        {"id": "x1", "expense_id": "e1", "participant": "Pip", "amount": 5, "status": "confirmed", "settlement_id": None},
        {"id": "x2", "expense_id": "e1", "participant": "Timo", "amount": 5, "status": "pending", "settlement_id": "s-between"},
        {"id": "x3", "expense_id": "e1", "participant": "Zoe", "amount": 5, "status": "pending", "settlement_id": None},
        {"id": "x4", "expense_id": "e2", "participant": "Pip", "amount": 4, "status": "pending", "settlement_id": None},
        {"id": "x5", "expense_id": "e2", "participant": "Timo", "amount": 6, "status": "pending", "settlement_id": None},
        {"id": "x6", "expense_id": "e3", "participant": "Pip", "amount": 2, "status": "pending", "settlement_id": "s-between"},
    ]
    db["settlements"] = [
        {"id": "s-between", "from_user_id": "p", "to_user_id": "t", "currency": "EUR", "status": "requested", "created_by": "p"},
        {"id": "s-zoe", "from_user_id": "z", "to_user_id": "p", "currency": "EUR", "status": "confirmed", "created_by": "z"},
    ]


# ── Who may, and what ─────────────────────────────────────────────────────────

def test_a_member_may_not_merge(env):
    _, client, user = env
    user["name"] = "Timo"
    assert merge(client).status_code == 403


def test_a_real_profile_cannot_be_merged_away(env):
    _, client, _ = env
    r = merge(client, source="z", target="t")
    assert r.status_code == 400
    assert "geen placeholder" in r.json()["detail"]


def test_a_placeholder_cannot_be_the_target(env):
    fake, client, _ = env
    r = merge(client, source="p", target="q")
    assert r.status_code == 400
    assert "placeholder" in r.json()["detail"]
    assert len(fake.db["profiles"]) == 5


def test_a_profile_cannot_be_merged_into_itself(env):
    _, client, _ = env
    r = merge(client, source="p", target="p")
    assert r.status_code == 400
    assert "zichzelf" in r.json()["detail"]


def test_an_inactive_member_cannot_be_the_target(env):
    fake, client, _ = env
    fake.db["profiles"][1]["is_active"] = False
    assert merge(client).status_code == 400


def test_unknown_profile_is_404(env):
    _, client, _ = env
    assert merge(client, source="nope").status_code == 404
    assert merge(client, target="nope").status_code == 404


def test_what_a_placeholder_is():
    assert profile_merge.is_placeholder(placeholder("p", "Pip"))
    # An admin typed in a Discord id ahead of time: still no login.
    assert profile_merge.is_placeholder(placeholder("p", "Pip", discord_id="123", is_first_login=False))
    assert not profile_merge.is_placeholder(real("t", "Timo"))
    assert not profile_merge.is_placeholder(placeholder("p", "Pip", discord_username="pip"))
    assert not profile_merge.is_placeholder(placeholder("p", "Pip", avatar_url="https://cdn/x.png"))


def test_the_user_lists_say_who_is_a_placeholder(env):
    _, client, _ = env
    rows = {u["name"]: u["is_placeholder"] for u in client.get("/api/admin/users").json()}
    assert rows == {"Ada": False, "Timo": False, "Zoe": False, "Pip": True, "Quinn": True}
    assert {u["name"]: u["is_placeholder"] for u in client.get("/api/users/").json()}["Pip"] is True


# ── The preview ───────────────────────────────────────────────────────────────

def test_a_dry_run_changes_nothing_and_counts(env):
    fake, client, _ = env
    seed(fake.db)
    before = json.dumps(fake.db, sort_keys=True)

    r = merge(client, dry_run=True)

    assert r.status_code == 200, r.text
    assert json.dumps(fake.db, sort_keys=True) == before
    body = r.json()
    assert body["dry_run"] is True
    assert body["source_name"] == "Pip" and body["target_name"] == "Timo"
    assert body["alias_names"] == ["Pip"]
    assert body["counts"] == {
        "rides": 3,            # r1 (driver and passenger), r2 and r4 (passenger, a car in r4)
        "meals": 2,            # m1, m2
        "trip_days": 1,
        "hotel_rooms": 1,
        "expenses": 1,         # e1
        "expense_shares": 5,   # e1: x1 and x2 become one; e2: x4 and x5 become one; e3: x6
        "settlements": 1,      # s-zoe moves
        "cosplays": 1,
        "photos": 2,
        "stories_seen": 2,
        "ride_costs": 2,
        "parking_spots": 2,    # one she drove, one she placed
        "feedback": 1,
        "push_subscriptions": 0,
        "badges": 1,
        "ticket_votes": 2,
    }
    assert body["dropped"] == {"settlements": 1, "ride_costs": 1, "parking_spots": 0, "restaurant_cars": 1}


def test_a_dry_run_is_the_default(env):
    fake, client, _ = env
    seed(fake.db)
    r = client.post("/api/admin/users/p/merge", json={"target_id": "t"})
    assert r.status_code == 200 and r.json()["dry_run"] is True
    assert any(p["id"] == "p" for p in fake.db["profiles"])


# ── The merge ─────────────────────────────────────────────────────────────────

def test_a_merge_moves_everything_once(env):
    fake, client, _ = env
    seed(fake.db)
    db = fake.db

    r = merge(client)

    assert r.status_code == 200, r.text
    assert r.json()["dry_run"] is False

    rides = {x["id"]: x for x in db["rides"]}
    assert rides["r1"]["driver"] == "Timo" and rides["r1"]["passengers"] == ["Timo", "Zoe"]
    # Timo was already on r2: still once
    assert rides["r2"]["passengers"] == ["Zoe", "Timo"]
    assert rides["r3"]["passengers"] == ["Zoe"]
    # r4: both had a car, they become one car with both passengers and the larger seat count
    assert rides["r4"]["passengers"] == ["Zoe", "Timo"]
    assert rides["r4"]["restaurant_drivers"] == [
        {"name": "Zoe", "seats": 3, "passengers": ["Zoe"]},
        {"name": "Timo", "seats": 4, "passengers": ["Timo"]},
    ]

    meals = {x["id"]: x for x in db["meals"]}
    assert meals["m1"] == {"id": "m1", "participants": ["Timo", "Zoe"], "created_by": "Timo"}
    # Timo is on m2 as "Tim" (a former name): Pip's entry just goes, he is not on it twice
    assert meals["m2"]["participants"] == ["Tim"]
    assert db["event_days"][0]["participants"] == ["Timo"]
    assert db["hotel_rooms"][0]["occupants"] == ["Timo", "Zoe"]
    assert [c["user_name"] for c in db["cosplays"]] == ["Timo", "Zoe"]
    assert {p["uploaded_by"] for p in db["story_photos"]} == {"Timo"}
    assert not [f for f in db["feedback"] if f["user_name"] != "Timo"]

    # what Pip had watched: the furthest of the two wins where Timo had watched the day too
    seen = {(s["user_name"], s["event_day_id"]): s["last_seen_seq"] for s in db["story_seen"]}
    assert seen == {("Timo", "d1"): 9, ("Timo", "d2"): 7}

    # one row per trip and driver: Pip's T2 row is dropped, T1 is renamed
    assert {(c["trip_id"], c["driver"], c["total_amount"]) for c in db["ride_costs"]} == {("T1", "Timo", 10), ("T2", "Timo", 30)}
    assert [(p["driver"], p["placed_by"]) for p in db["parking_spots"]] == [("Timo", "Zoe"), ("Zoe", "Timo")]

    # one vote per ticket vote: Pip's second vote is dropped, the other renamed; the buyer is renamed too
    assert {(v["poll_id"], v["voter"]) for v in db["ticket_votes"]} == {("tp1", "Timo"), ("tp2", "Timo")}
    assert [b["buyer"] for b in db["ticket_polls"]] == ["Timo", "Zoe"]

    # the member has the placeholder's badge and name, and the placeholder is gone
    timo = next(p for p in db["profiles"] if p["id"] == "t")
    assert timo["badge_ids"] == ["b1"]
    assert timo["aliases"] == ["Tim", "Pip"]
    assert not any(p["id"] == "p" for p in db["profiles"])
    assert any(p["id"] == "q" for p in db["profiles"])  # the other placeholder is untouched


def test_money_follows_the_member_and_nobody_owes_themselves(env):
    fake, client, _ = env
    seed(fake.db)

    assert merge(client).status_code == 200

    expenses = {e["id"]: e["paid_by"] for e in fake.db["expenses"]}
    assert expenses == {"e1": "Timo", "e2": "Zoe", "e3": "Timo"}
    shares = {s["id"]: s for s in fake.db["expense_shares"]}
    # e1 was paid by Pip: Timo's share of it is now Timo's own, so it is settled, and Pip's own (settled)
    # share joins it into one
    own = [s for s in fake.db["expense_shares"] if s["expense_id"] == "e1" and s["participant"] == "Timo"]
    assert len(own) == 1 and own[0]["status"] == "confirmed" and own[0]["amount"] == 10 and own[0]["settlement_id"] is None
    assert shares["x3"]["participant"] == "Zoe" and shares["x3"]["status"] == "pending"
    # e2: Pip and Timo both owed Zoe, now one share for the sum
    owed = [s for s in fake.db["expense_shares"] if s["expense_id"] == "e2" and s["participant"] == "Timo"]
    assert len(owed) == 1 and owed[0]["amount"] == 10 and owed[0]["status"] == "pending"
    # e3: Pip owed Timo; now Timo owes Timo, which is settled and no longer in a settlement
    assert shares["x6"]["participant"] == "Timo" and shares["x6"]["status"] == "confirmed" and shares["x6"]["settlement_id"] is None


def test_settlements_move_and_one_between_the_two_is_dropped(env):
    fake, client, _ = env
    seed(fake.db)

    assert merge(client).status_code == 200

    rows = {s["id"]: s for s in fake.db["settlements"]}
    assert "s-between" not in rows  # never a settlement from someone to themselves
    assert rows["s-zoe"]["to_user_id"] == "t" and rows["s-zoe"]["from_user_id"] == "z"
    assert all(s["from_user_id"] != s["to_user_id"] for s in fake.db["settlements"])


def test_open_settlements_with_the_same_person_block_the_merge(env):
    fake, client, _ = env
    fake.db["settlements"] = [
        {"id": "a", "from_user_id": "p", "to_user_id": "z", "currency": "EUR", "status": "requested", "created_by": "p"},
        {"id": "b", "from_user_id": "z", "to_user_id": "t", "currency": "EUR", "status": "claimed", "created_by": "z"},
    ]
    before = json.dumps(fake.db, sort_keys=True)

    r = merge(client, dry_run=True)

    assert r.status_code == 409
    assert "Zoe" in r.json()["detail"] and "Afrekenen" in r.json()["detail"]
    assert json.dumps(fake.db, sort_keys=True) == before


def test_a_member_who_is_not_on_anything_loses_nothing(env):
    fake, client, _ = env
    fake.db["rides"] = [{"id": "r1", "driver": "Zoe", "passengers": ["Zoe", "Timo"], "restaurant_drivers": []}]

    r = merge(client)

    assert r.status_code == 200
    assert fake.db["rides"][0]["passengers"] == ["Zoe", "Timo"]
    assert all(v == 0 for k, v in r.json()["counts"].items() if k != "badges")


def test_the_placeholders_own_aliases_move_too(env):
    fake, client, _ = env
    fake.db["profiles"][3]["aliases"] = ["Pippie"]
    fake.db["meals"] = [{"id": "m1", "participants": ["Pippie", "Pip", "Timo"], "created_by": None}]

    assert merge(client).status_code == 200

    assert fake.db["meals"][0]["participants"] == ["Timo"]
    timo = next(p for p in fake.db["profiles"] if p["id"] == "t")
    assert timo["aliases"] == ["Tim", "Pip", "Pippie"]


def test_tables_from_a_later_migration_may_be_missing(env):
    fake, client, _ = env
    seed(fake.db)
    fake.missing = {"parking_spots", "ride_costs", "feedback", "push_subscriptions", "story_seen", "ticket_votes", "ticket_polls"}

    r = merge(client)

    assert r.status_code == 200, r.text
    assert not any(p["id"] == "p" for p in fake.db["profiles"])


def test_a_failure_halfway_leaves_the_placeholder_to_try_again(env, monkeypatch):
    fake, client, _ = env
    seed(fake.db)
    original = profile_merge._write
    failures = {"left": 1}

    def failing_once(what, call):
        if what.startswith("rename cosplays") and failures["left"]:
            failures["left"] -= 1
            return original(what, lambda: (_ for _ in ()).throw(Exception("connection lost")))
        return original(what, call)

    monkeypatch.setattr(profile_merge, "_write", failing_once)

    r = merge(client)
    assert r.status_code == 503 and "probeer het nog een keer" in r.json()["detail"]
    assert any(p["id"] == "p" for p in fake.db["profiles"])  # still there: nothing points at a missing profile
    assert [c["user_name"] for c in fake.db["cosplays"]] == ["Pip", "Zoe"]

    # Again: it carries on where it stopped and ends up the same as a merge that never failed
    assert merge(client).status_code == 200
    assert not any(p["id"] == "p" for p in fake.db["profiles"])
    assert [c["user_name"] for c in fake.db["cosplays"]] == ["Timo", "Zoe"]
    assert next(p for p in fake.db["profiles"] if p["id"] == "t")["aliases"] == ["Tim", "Pip"]
    assert {s["id"] for s in fake.db["settlements"]} == {"s-zoe"}


def test_a_restaurant_car_after_the_first_still_knows_the_members_former_names():
    """Timo is on the second car as "Tim" (a former name) next to Pip: he must not end up on it twice."""
    cars = [
        {"name": "Yan", "seats": 3, "passengers": ["Yan"]},
        {"name": "Xen", "seats": 3, "passengers": ["Xen", "Pip", "Tim"]},
    ]
    out = profile_merge._swap_cars(cars, {"Pip"}, "Timo", {"Timo", "Tim"})
    assert out == [
        {"name": "Yan", "seats": 3, "passengers": ["Yan"]},
        {"name": "Xen", "seats": 3, "passengers": ["Xen", "Tim"]},
    ]
