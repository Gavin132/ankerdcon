"""A person sleeps in one room of a hotel.

Every route that writes who is in a room goes through here (`put_people_in_room`, `take_out_of_other_rooms`), so
the rule is kept in one place: putting a person in a room MOVES them, they are taken out of every other room of the
same hotel (the rooms of one event) in the same request.

"A person" is not "a stored name". Rooms store names, and one member can be on a list under several of them: their
current name, their Discord username, a former name (alias). Those are one person, which is what `_people` works out
(the same rule as `groupPeople` in `frontend/src/utils/people.ts`): moving "samdraws" into a room also takes the
member's other names out of the other rooms, and adding a member who is in the room under another name adds nobody.

There are no transactions, so the order of the steps matters (see `put_people_in_room`).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from fastapi import HTTPException, status

from app.constants import Tables
from app.core.atomic import update_list
from app.core.database import supabase
from app.core.logging import get_logger

logger = get_logger(__name__)

_DB_ERROR = "Databasefout. Probeer het opnieuw."
_NO_ROOM = "Kamer niet gevonden."

# "Leave the capacity as the room has it" (None would mean: the room has no capacity).
KEEP_CAPACITY = object()


@dataclass(eq=False)  # compared by identity, so a person can be a dict key
class _Person:
    key: str
    display: str                  # the member's current name, else the name they were given
    names: list[str]              # the stored names the request had them under; the first is the one written
    identities: set[str] = field(default_factory=set)   # every name a room may carry them under, casefolded


def _members() -> list[dict]:
    try:
        return supabase.table(Tables.PROFILES).select("name, discord_username, aliases").execute().data or []
    except Exception as e:
        logger.error("Member lookup failed for the hotel rooms: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


def _names_of(row: dict) -> list[str]:
    return [n for n in [row.get("name"), row.get("discord_username"), *(row.get("aliases") or [])] if n]


def _find_member(members: list[dict], stored: str) -> dict | None:
    """The member a stored name belongs to: current name, else Discord username, else former name, in that order."""
    return (
        next((m for m in members if m.get("name") == stored), None)
        or next((m for m in members if m.get("discord_username") == stored), None)
        or next((m for m in members if stored in (m.get("aliases") or [])), None)
    )


def _identities(member: dict, members: list[dict]) -> set[str]:
    """Every name a room can carry for this member. A former name only counts while no other member goes by it
    (members edit their own alias list), the same rule as `_own_names` in dependencies.py."""
    taken: set[str] = set()
    for other in members:
        if other.get("name") != member.get("name"):
            taken.update(n.casefold() for n in _names_of(other))
    return {n.casefold() for n in _names_of(member) if n == member.get("name") or n.casefold() not in taken}


def _people(names: list[str], members: list[dict]) -> list[_Person]:
    """The people behind a list of stored names, in the order they first appear, each once."""
    by_key: dict[str, _Person] = {}
    for stored in names:
        member = _find_member(members, stored)
        key = f"user:{member['name']}" if member else f"name:{stored.casefold()}"
        person = by_key.get(key)
        if person is None:
            person = _Person(key, member["name"] if member else stored, [], _identities(member, members) if member else set())
            by_key[key] = person
        if stored not in person.names:
            person.names.append(stored)
        person.identities.add(stored.casefold())
    return list(by_key.values())


def count_people(names: list[str]) -> int:
    """How many people a list of stored names is (someone under two names counts once)."""
    return len(_people([n for n in names if n], _members())) if names else 0


def distinct_people_names(names: list[str]) -> list[str]:
    """The list with every person once: the first name each was given under."""
    return [p.names[0] for p in _people([n for n in names if n], _members())] if names else []


def too_many_message(count: int, capacity: int, *, replacing: bool) -> str:
    if replacing:
        return f"Deze kamer heeft plaats voor {capacity} {'persoon' if capacity == 1 else 'personen'}, maar er zouden er {count} in slapen."
    return f"Deze kamer zit vol (max {capacity} personen)."


def _rooms_of(group_key: str) -> list[dict]:
    try:
        return supabase.table(Tables.HOTEL_ROOMS).select("id, room_number, capacity, occupants").eq("event_id", group_key).execute().data or []
    except Exception as e:
        logger.error("Failed to read the rooms of event %s: %s", group_key, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


def _take_out(group_key: str, keep_room_id: str, people: list[_Person], rooms: list[dict] | None = None) -> list[dict]:
    """Take these people out of every room of the hotel except `keep_room_id`. Returns who was moved out of which
    room: `[{name, room_id, room_number}]`."""
    owner_of = {identity: person for person in reversed(people) for identity in person.identities}
    moved: list[dict] = []
    for other in rooms if rooms is not None else _rooms_of(group_key):
        if other["id"] == keep_room_id or not any(n.casefold() in owner_of for n in other.get("occupants") or []):
            continue
        removed: list[_Person] = []

        def remove(current: list, _row: dict) -> list | None:
            removed.clear()  # runs again on fresh data when someone else changed the room first
            keep = []
            for stored in current:
                owner = owner_of.get(stored.casefold())
                if owner is None:
                    keep.append(stored)
                else:
                    removed.append(owner)
            return keep if len(keep) != len(current) else None

        try:
            row, _ = update_list(Tables.HOTEL_ROOMS, other["id"], "occupants", remove, select="occupants, room_number", not_found=_NO_ROOM)
        except HTTPException as e:
            if e.status_code == status.HTTP_404_NOT_FOUND:
                continue  # the room was deleted in the meantime: nobody is in it any more
            raise
        for person in dict.fromkeys(removed):
            moved.append({"name": person.display, "room_id": other["id"], "room_number": row.get("room_number")})
    return moved


def take_out_of_other_rooms(group_key: str, keep_room_id: str, names: list[str]) -> list[dict]:
    """For a room that was just created with people in it: they leave the hotel's other rooms."""
    people = _people([n for n in names if n], _members())
    return _take_out(group_key, keep_room_id, people) if people else []


def put_people_in_room(
    group_key: str,
    room_id: str,
    names: list[str],
    *,
    replace: bool = False,
    capacity: object = KEEP_CAPACITY,
) -> list[dict]:
    """Put people in a room of the hotel `group_key` (the parent event's id) and take them out of its other rooms.

    `replace=False` adds `names` to who is there (a bed for someone); `replace=True` makes `names` the whole list
    (the room form). `capacity` overrides the room's own when the same request changes it.

    The order, because there are no transactions: first the capacity is checked and the people are added to the
    room they are going to, and only then are they taken out of the other rooms. A full room therefore refuses
    before anyone has left their old one, and when a later step fails (the database goes away) the worst case is
    somebody in two rooms for a while, which the Hotel sheet shows and which putting them in a room again repairs,
    never somebody in no room at all.

    Returns the people who were moved out of another room (see `_take_out`)."""
    rooms = _rooms_of(group_key)
    if not any(r["id"] == room_id for r in rooms):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NO_ROOM)

    members = _members()
    people = _people([n for n in names if n], members)

    def change(current: list, row: dict) -> list | None:
        if replace:
            # Someone who is in the room already keeps the name they are under (a Discord username stays one).
            stored = {n.casefold(): n for n in current}
            new = [next((stored[n.casefold()] for n in p.names if n.casefold() in stored), p.names[0]) for p in people]
        else:
            present = {n.casefold() for n in current}
            new = current + [p.names[0] for p in people if not p.identities & present]
        limit = row.get("capacity") if capacity is KEEP_CAPACITY else capacity
        if limit is not None and (replace or new != current):
            count = len(_people(new, members))
            if count > limit:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=too_many_message(count, limit, replacing=replace))
        return new

    update_list(Tables.HOTEL_ROOMS, room_id, "occupants", change, select="occupants, capacity", not_found=_NO_ROOM)
    return _take_out(group_key, room_id, people, rooms) if people else []
