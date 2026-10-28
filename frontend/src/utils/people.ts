import type { User } from "../types";

/** The member a stored name belongs to: by current name, Discord username or a former name (alias). */
export const findUser = (users: User[], name: string): User | undefined =>
  users.find((u) => u.name === name || u.discord_username === name || u.aliases?.includes(name));

/**
 * One person on a list of stored names. Lists (a trip's sign-ups, a ride's passengers) store *names*, and a member
 * who was renamed, or was signed up by their Discord username, can be on the same list under two of them: "Sam"
 * for Friday, the old "samdraws" for Saturday. They are one person and must be shown, counted and checked as one.
 */
export interface Person {
  /** What to show and look up: the member's current name, else the first name they are on the list under. */
  name: string;
  /** The names they are on this list under, as stored. Removing them from a list takes these, not `name`. */
  names: string[];
  /** Every name this person may appear under elsewhere (a ride, a meal, a room): the above plus their own current
   * name, Discord username and former names. Lower case. */
  identities: Set<string>;
  user?: User;
}

/** A former name only counts for its owner while no other member goes by it, the rule acting-as and settling use. */
function ownIdentities(user: User, users: User[]): string[] {
  const taken = new Set<string>();
  for (const other of users) {
    if (other === user) continue;
    taken.add(other.name);
    if (other.discord_username) taken.add(other.discord_username);
    for (const alias of other.aliases ?? []) taken.add(alias);
  }
  return [user.name, user.discord_username, ...(user.aliases ?? [])].filter((n): n is string => !!n && !taken.has(n));
}

/** The people behind a list of stored names, in the order they first appear, each once. */
export function groupPeople(names: string[], users: User[]): Person[] {
  const byKey = new Map<string, Person>();
  for (const raw of names) {
    const user = findUser(users, raw);
    // A name that is no member (a guest) is told apart by its name alone, ignoring case.
    const key = user ? `user:${user.id ?? user.name}` : `name:${raw.toLowerCase()}`;
    let person = byKey.get(key);
    if (!person) {
      person = { name: user?.name ?? raw, names: [], identities: new Set(user ? ownIdentities(user, users).map((n) => n.toLowerCase()) : []), user };
      byKey.set(key, person);
    }
    if (!person.names.includes(raw)) person.names.push(raw);
    person.identities.add(raw.toLowerCase());
  }
  return [...byKey.values()];
}

/** Whether this person is any of the names in `set` (lower case), whichever name the list has them under. */
export const isIn = (person: Person, set: Set<string>): boolean => [...person.identities].some((n) => set.has(n));
