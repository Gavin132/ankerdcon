"""The ticket vote: who may open, vote on and close it."""
import itertools
from types import SimpleNamespace

import pytest
from fastapi import BackgroundTasks, HTTPException

from app import dependencies
from app.models.ticket_poll import CastVoteRequest, OpenTicketPollRequest, TicketOption, TicketsBoughtRequest
from app.routers import ticket_polls as router
from app.services import notification_service

_ids = itertools.count(1)


class _Result:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self, db, name):
        self.db, self.name = db, name
        self.op, self.payload, self.filters, self.conflict = "select", None, [], None

    def select(self, *_):
        return self

    def eq(self, col, val):
        self.filters.append(lambda r: r.get(col) == val)
        return self

    def limit(self, *_):
        return self

    def insert(self, payload):
        self.op, self.payload = "insert", payload
        return self

    def update(self, payload):
        self.op, self.payload = "update", payload
        return self

    def upsert(self, payload, on_conflict=None):
        self.op, self.payload, self.conflict = "upsert", payload, on_conflict
        return self

    def delete(self):
        self.op = "delete"
        return self

    def execute(self):
        rows = self.db.tables[self.name]
        if self.op == "insert":
            row = {"id": f"id{next(_ids)}", "status": "open", "buyer": None, "chosen_option": None, **self.payload}
            rows.append(row)
            return _Result([row])
        if self.op == "upsert":
            keys = self.conflict.split(",")
            for r in rows:
                if all(r[k] == self.payload[k] for k in keys):
                    r.update(self.payload)
                    return _Result([r])
            rows.append(dict(self.payload))
            return _Result([self.payload])
        match = [r for r in rows if all(f(r) for f in self.filters)]
        if self.op == "update":
            for r in match:
                r.update(self.payload)
        elif self.op == "delete":
            for r in match:
                rows.remove(r)
        return _Result(match)


class FakeDb:
    def __init__(self, **tables):
        self.tables = {n: [] for n in ("events", "event_days", "ticket_polls", "ticket_votes")}
        self.tables.update(tables)

    def table(self, name):
        return _Query(self, name)


OPTIONS = OpenTicketPollRequest(options=[TicketOption(label="Za + Zo", price=85), TicketOption(label="Za", price=50)])
SETTINGS = SimpleNamespace(discord_bot_token="")


@pytest.fixture
def db(monkeypatch):
    fake = FakeDb(
        events=[{"id": "E", "title": "HMIA 2026"}],
        event_days=[{"id": "d1", "event_id": "E"}, {"id": "d2", "event_id": "E"}],
    )
    monkeypatch.setattr(router, "supabase", fake)
    monkeypatch.setattr(dependencies, "_is_admin", lambda name: name == "Admin")
    monkeypatch.setattr(dependencies, "_is_own_former_name", lambda *_: False)
    monkeypatch.setattr(router, "_profile_exists", lambda name: name in {"Sam", "Pip"})
    monkeypatch.setattr(dependencies, "_profile_exists", lambda name: name in {"Sam", "Pip"})
    monkeypatch.setattr(notification_service, "trip_names_for_day", lambda day_id: {"Sam", "Pip"})
    return fake


def open_poll(trip="E"):
    tasks = BackgroundTasks()
    poll = router.open_ticket_poll(trip, OPTIONS, tasks, SETTINGS, "Admin")
    return poll, tasks


def test_there_is_no_poll_until_an_admin_opens_one(db):
    assert router.get_ticket_poll("E", "Sam") is None


def test_opening_gives_the_options_ids_and_tells_the_trip(db):
    poll, tasks = open_poll()
    assert [(o.id, o.label, o.price) for o in poll.options] == [("o1", "Za + Zo", 85), ("o2", "Za", 50)]
    assert poll.status == "open"
    assert len(tasks.tasks) == 1


def test_a_trip_id_may_be_one_of_its_days(db):
    poll, _ = open_poll("d2")
    assert poll.event_id == "E"
    assert router.get_ticket_poll("d1", "Sam").id == poll.id


def test_only_one_poll_per_trip(db):
    open_poll()
    with pytest.raises(HTTPException) as e:
        open_poll()
    assert e.value.status_code == 409


def test_an_unknown_trip_is_a_404(db):
    with pytest.raises(HTTPException) as e:
        router.get_ticket_poll("nope", "Sam")
    assert e.value.status_code == 404


def test_a_vote_can_be_changed(db):
    open_poll()
    router.cast_ticket_vote("E", CastVoteRequest(choice="o1"), "Sam")
    router.cast_ticket_vote("E", CastVoteRequest(choice="unsure"), "Sam")
    poll = router.get_ticket_poll("E", "Sam")
    assert [(v.voter, v.choice) for v in poll.votes] == [("Sam", "unsure")]


def test_a_choice_outside_the_options_is_refused(db):
    open_poll()
    with pytest.raises(HTTPException) as e:
        router.cast_ticket_vote("E", CastVoteRequest(choice="o9"), "Sam")
    assert e.value.status_code == 400


def test_a_member_can_fill_the_vote_in_for_another_member(db):
    open_poll()
    router.cast_ticket_vote("E", CastVoteRequest(user_name="Pip", choice="o1"), "Sam")
    assert [(v.voter, v.choice) for v in router.get_ticket_poll("E", "Sam").votes] == [("Pip", "o1")]


def test_a_vote_cannot_be_cast_for_someone_who_is_not_a_member(db):
    open_poll()
    with pytest.raises(HTTPException) as e:
        router.cast_ticket_vote("E", CastVoteRequest(user_name="Nobody", choice="o1"), "Sam")
    assert e.value.status_code == 400


def test_a_vote_can_be_withdrawn_for_yourself_or_someone_else(db):
    open_poll()
    router.cast_ticket_vote("E", CastVoteRequest(choice="o1"), "Sam")
    router.cast_ticket_vote("E", CastVoteRequest(user_name="Pip", choice="o2"), "Sam")
    router.withdraw_ticket_vote("E", None, "Sam")
    assert [v.voter for v in router.get_ticket_poll("E", "Sam").votes] == ["Pip"]
    router.withdraw_ticket_vote("E", "Pip", "Sam")
    assert router.get_ticket_poll("E", "Sam").votes == []
    router.withdraw_ticket_vote("E", None, "Sam")  # nothing left to withdraw: not an error


def test_a_vote_cannot_be_withdrawn_once_the_tickets_are_bought(db):
    open_poll()
    router.cast_ticket_vote("E", CastVoteRequest(choice="o1"), "Sam")
    router.tickets_bought("E", TicketsBoughtRequest(buyer="Sam", option_id="o1"), BackgroundTasks(), SETTINGS, "Admin")
    with pytest.raises(HTTPException) as e:
        router.withdraw_ticket_vote("E", None, "Sam")
    assert e.value.status_code == 409


def test_voting_without_a_poll_is_a_404(db):
    with pytest.raises(HTTPException) as e:
        router.cast_ticket_vote("E", CastVoteRequest(choice="o1"), "Sam")
    assert e.value.status_code == 404


def test_buying_closes_the_vote(db):
    open_poll()
    router.cast_ticket_vote("E", CastVoteRequest(choice="o1"), "Sam")
    tasks = BackgroundTasks()
    poll = router.tickets_bought("E", TicketsBoughtRequest(buyer="Sam", option_id="o1"), tasks, SETTINGS, "Admin")
    assert (poll.status, poll.buyer, poll.chosen_option) == ("bought", "Sam", "o1")
    assert len(tasks.tasks) == 1
    with pytest.raises(HTTPException) as e:
        router.cast_ticket_vote("E", CastVoteRequest(choice="o2"), "Sam")
    assert e.value.status_code == 409
    with pytest.raises(HTTPException) as e:
        router.tickets_bought("E", TicketsBoughtRequest(buyer="Sam", option_id="o1"), BackgroundTasks(), SETTINGS, "Admin")
    assert e.value.status_code == 409


def test_the_buyer_has_to_be_a_member_and_the_option_has_to_exist(db):
    open_poll()
    with pytest.raises(HTTPException) as e:
        router.tickets_bought("E", TicketsBoughtRequest(buyer="Nobody", option_id="o1"), BackgroundTasks(), SETTINGS, "Admin")
    assert e.value.status_code == 400
    with pytest.raises(HTTPException) as e:
        router.tickets_bought("E", TicketsBoughtRequest(buyer="Sam", option_id="o9"), BackgroundTasks(), SETTINGS, "Admin")
    assert e.value.status_code == 400


def test_deleting_removes_the_poll_so_it_can_be_opened_again(db):
    open_poll()
    router.delete_ticket_poll("E", "Admin")
    assert router.get_ticket_poll("E", "Sam") is None
    open_poll()


def test_a_database_error_is_a_503(db, monkeypatch):
    class Broken:
        def table(self, *_):
            raise RuntimeError("down")

    monkeypatch.setattr(router, "supabase", Broken())
    with pytest.raises(HTTPException) as e:
        router.get_ticket_poll("E", "Sam")
    assert e.value.status_code == 503


@pytest.mark.parametrize("route", ["open_ticket_poll", "tickets_bought", "delete_ticket_poll"])
def test_only_admins_may_open_buy_or_delete(route):
    """The endpoints depend on get_admin_user, which refuses a member."""
    import inspect
    default = inspect.signature(getattr(router, route)).parameters["admin"].default
    assert default.dependency is dependencies.get_admin_user
