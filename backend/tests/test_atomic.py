"""Signing up without losing anybody else's sign-up.

A stand-in table holds one row; `race` runs between a read and the write that
follows, the way a second request would."""
import pytest
from fastapi import HTTPException

from app.core import atomic
from app.routers import rides


class _Result:
    def __init__(self, data):
        self.data = data


class Table:
    """One-row-per-id table with just the query methods update_list uses."""

    def __init__(self, rows):
        self.rows = {r["id"]: r for r in rows}
        self.race = None          # called once, right after the first read
        self.writes = 0
        self._raced = False

    def table(self, _name):
        return _Query(self)


class _Query:
    def __init__(self, t):
        self.t, self.op, self.payload, self.conds = t, "select", None, []

    def select(self, *_):
        self.op = "select"
        return self

    def update(self, payload):
        self.op, self.payload = "update", payload
        return self

    def eq(self, col, val):
        self.conds.append((col, "eq", val))
        return self

    def is_(self, col, val):
        self.conds.append((col, "null", val))
        return self

    def filter(self, col, op, val):
        self.conds.append((col, op, val))
        return self

    def _match(self, row):
        for col, op, val in self.conds:
            if op == "null":
                ok = row.get(col) is None
            elif col == "id":
                ok = row["id"] == val
            else:
                ok = atomic._text_array_literal(row[col]) == val if row.get(col) is not None else False
                if isinstance(row.get(col), list) and row[col] and isinstance(row[col][0], dict):
                    import json
                    ok = json.dumps(row[col], separators=(",", ":"), ensure_ascii=False) == val
                elif row.get(col) == [] and val == "{}":
                    ok = True
            if not ok:
                return False
        return True

    def execute(self):
        rows = [dict(r) for r in self.t.rows.values() if self._match(r)]
        if self.op == "update":
            out = []
            for r in self.t.rows.values():
                if self._match(r):
                    r.update(self.payload)
                    self.t.writes += 1
                    out.append(dict(r))
            return _Result(out)
        result = _Result(rows)
        if self.t.race and not self.t._raced:
            self.t._raced = True
            self.t.race(self.t)
        return result


def _use(monkeypatch, rows):
    t = Table(rows)
    monkeypatch.setattr(atomic, "supabase", t)
    monkeypatch.setattr(rides, "supabase", t)
    return t


ADD = lambda name: (lambda names, _row: None if name in names else names + [name])  # noqa: E731


def test_text_array_literal_quotes_every_name():
    assert atomic._text_array_literal([]) == "{}"
    assert atomic._text_array_literal(["Sam", "Zoë de Vries"]) == '{"Sam","Zoë de Vries"}'
    assert atomic._text_array_literal(['a,b', 'c"d', 'e\\f']) == '{"a,b","c\\"d","e\\\\f"}'


def test_a_plain_change_is_written(monkeypatch):
    t = _use(monkeypatch, [{"id": "m1", "participants": ["Sam"]}])
    _, now = atomic.update_list("meals", "m1", "participants", ADD("Alex"))
    assert now == ["Sam", "Alex"] and t.rows["m1"]["participants"] == ["Sam", "Alex"]


def test_nothing_to_change_writes_nothing(monkeypatch):
    t = _use(monkeypatch, [{"id": "m1", "participants": ["Sam"]}])
    atomic.update_list("meals", "m1", "participants", ADD("Sam"))
    assert t.writes == 0


def test_a_null_list_counts_as_empty(monkeypatch):
    t = _use(monkeypatch, [{"id": "m1", "participants": None}])
    atomic.update_list("meals", "m1", "participants", ADD("Sam"))
    assert t.rows["m1"]["participants"] == ["Sam"]


def test_two_sign_ups_at_once_keep_both(monkeypatch):
    t = _use(monkeypatch, [{"id": "m1", "participants": ["Sam"]}])
    # Between our read and our write, somebody else signs up.
    t.race = lambda tt: tt.rows["m1"].update(participants=["Sam", "Alex"])
    atomic.update_list("meals", "m1", "participants", ADD("Bo"))
    assert t.rows["m1"]["participants"] == ["Sam", "Alex", "Bo"]  # Alex was not lost


def test_two_people_cannot_take_the_last_seat(monkeypatch):
    t = _use(monkeypatch, [{"id": "r1", "passengers": ["Sam"], "total_seats": 2}])
    t.race = lambda tt: tt.rows["r1"].update(passengers=["Sam", "Alex"])  # the seat goes first
    from app.models.rides import ClaimSeatRequest
    with pytest.raises(HTTPException) as e:
        rides.claim_seat("r1", ClaimSeatRequest(user_name="Bo"), current_user="Bo")
    assert e.value.status_code == 400 and e.value.detail == "Rit is vol."
    assert t.rows["r1"]["passengers"] == ["Sam", "Alex"]


def test_restaurant_cars_are_compared_as_json(monkeypatch):
    cars = [{"name": "Sam", "seats": 4, "passengers": ["Sam"]}]
    t = _use(monkeypatch, [{"id": "r1", "restaurant_drivers": cars}])
    t.race = lambda tt: tt.rows["r1"].update(restaurant_drivers=[{"name": "Sam", "seats": 4, "passengers": ["Sam", "Alex"]}])

    def add_bo(drivers, _row):
        drivers[0]["passengers"].append("Bo")
        return drivers

    atomic.update_list("rides", "r1", "restaurant_drivers", add_bo, jsonb=True)
    assert t.rows["r1"]["restaurant_drivers"][0]["passengers"] == ["Sam", "Alex", "Bo"]


def test_a_missing_row_is_a_404(monkeypatch):
    _use(monkeypatch, [])
    with pytest.raises(HTTPException) as e:
        atomic.update_list("meals", "nope", "participants", ADD("Sam"), not_found="Maaltijd niet gevonden.")
    assert e.value.status_code == 404 and e.value.detail == "Maaltijd niet gevonden."


def test_giving_up_after_too_many_collisions(monkeypatch):
    t = _use(monkeypatch, [{"id": "m1", "participants": ["Sam"]}])
    counter = iter(range(100))

    def always_changing(_row, _t=t):
        # Every read sees a list somebody else is about to change.
        _t.rows["m1"]["participants"] = ["Sam", f"x{next(counter)}"]

    orig = Table.table
    def table(self, name):
        q = orig(self, name)
        original_execute = q.execute
        def execute():
            res = original_execute()
            if q.op == "select":
                always_changing(None)
            return res
        q.execute = execute
        return q
    monkeypatch.setattr(Table, "table", table)
    with pytest.raises(HTTPException) as e:
        atomic.update_list("meals", "m1", "participants", ADD("Bo"))
    assert e.value.status_code == 503
