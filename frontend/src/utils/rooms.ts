import { groupPeople, type Person } from "./people";
import type { HotelRoom, RoomMove, User } from "../types";

/**
 * A person sleeps in ONE room of a hotel. The backend enforces it (`services/hotel_rooms.py`): putting someone in a
 * room moves them out of the others. These helpers show what the backend did (`roomMoveMessage`) and rooms made before
 * the rule that still hold somebody twice (`peopleInSeveralRooms`).
 */

/** "kamer 12", or "een kamer zonder nummer" when the hotel has not handed out numbers yet. */
export const roomLabel = (room: { room_number?: string | null }): string =>
  room.room_number ? `kamer ${room.room_number}` : "een kamer zonder nummer";

/** "Sam", "Sam en Alex", "Sam, Alex en Noor". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} en ${names[names.length - 1]}`;
}

export interface RoomDuplicate {
  person: Person;
  /** The rooms this person is in, in the order the rooms come. Always two or more. */
  rooms: HotelRoom[];
}

/**
 * The people who are in more than one room, whichever name each room has them under (current name, Discord username,
 * a former name). Someone on one room under two names is in one room, not two.
 */
export function peopleInSeveralRooms(rooms: HotelRoom[], users: User[]): RoomDuplicate[] {
  return groupPeople(rooms.flatMap((r) => r.occupants), users)
    .map((person) => ({ person, rooms: rooms.filter((r) => r.occupants.some((n) => person.identities.has(n.toLowerCase()))) }))
    .filter((d) => d.rooms.length > 1);
}

/** The other rooms this person is in (empty when the room is the only one), for the mark on their name. */
export function otherRoomsOf(person: Person, room: HotelRoom, duplicates: RoomDuplicate[]): HotelRoom[] {
  const found = duplicates.find((d) => d.person === person || d.person.name === person.name);
  return found ? found.rooms.filter((r) => r.id !== room.id) : [];
}

/**
 * Who among `names` (the people picked for a room) sleeps in another room now, and where: the room form says they will
 * be moved. `roomId` is the room being edited (null for a new one), which does not count as "another".
 */
export function peopleInOtherRooms(
  names: string[],
  rooms: HotelRoom[],
  users: User[],
  roomId: string | null,
): { name: string; rooms: HotelRoom[] }[] {
  const others = rooms.filter((r) => r.id !== roomId);
  return groupPeople(names, users)
    .map((person) => ({ name: person.name, rooms: others.filter((r) => r.occupants.some((n) => person.identities.has(n.toLowerCase()))) }))
    .filter((p) => p.rooms.length > 0);
}

/** "Sam slaapt nu in kamer 12 en wordt naar deze kamer verplaatst." */
export function moveHint(found: { name: string; rooms: HotelRoom[] }[]): string {
  if (found.length === 0) return "";
  if (found.length === 1) {
    return `${found[0].name} slaapt nu in ${joinNames(found[0].rooms.map(roomLabel))} en wordt naar deze kamer verplaatst.`;
  }
  const who = found.map((p) => `${p.name} (${joinNames(p.rooms.map(roomLabel))})`);
  return `${joinNames(who)} slapen nu in een andere kamer en worden naar deze kamer verplaatst.`;
}

/** The warning above the room grid: "Sam staat in 2 kamers", or several people at once. */
export function duplicateNotice(duplicates: RoomDuplicate[]): string {
  if (duplicates.length === 0) return "";
  if (duplicates.length === 1) return `${duplicates[0].person.name} staat in ${duplicates[0].rooms.length} kamers`;
  return `${joinNames(duplicates.map((d) => `${d.person.name} (${d.rooms.length} kamers)`))} staan in meer dan één kamer`;
}

/**
 * What to tell the member after a write moved people: "Sam is verplaatst van kamer 12 naar kamer 4." One sentence per
 * room they left. `toRoomNumber` is the room they went to. Empty when nobody moved.
 */
export function roomMoveMessage(moved: RoomMove[], toRoomNumber: string | null | undefined): string {
  const byRoom = new Map<string, RoomMove[]>();
  for (const move of moved) byRoom.set(move.room_id, [...(byRoom.get(move.room_id) ?? []), move]);
  return [...byRoom.values()]
    .map((moves) => {
      const names = [...new Set(moves.map((m) => m.name))];
      return `${joinNames(names)} ${names.length === 1 ? "is" : "zijn"} verplaatst van ${roomLabel(moves[0])} naar ${roomLabel({ room_number: toRoomNumber })}.`;
    })
    .join(" ");
}
