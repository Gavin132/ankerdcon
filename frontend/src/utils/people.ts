import type { User } from "../types";

/**
 * The member a stored name belongs to: by current name, else Discord username, else a former name (alias). In that
 * order, so a name that is one member's current name is never taken for another member's former one.
 */
export const findUser = (users: User[], name: string): User | undefined =>
  users.find((u) => u.name === name) ?? users.find((u) => u.discord_username === name) ?? users.find((u) => u.aliases?.includes(name));

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
    if (other === user || other.name === user.name) continue; // `user` may be a copy (the signed-in member)
    taken.add(other.name);
    if (other.discord_username) taken.add(other.discord_username);
    for (const alias of other.aliases ?? []) taken.add(alias);
  }
  return [user.name, user.discord_username, ...(user.aliases ?? [])].filter((n): n is string => !!n && !taken.has(n));
}

/**
 * Every name a stored row can carry for the signed-in member: their current name, their Discord username and their
 * former names (aliases), minus any name another member goes by. Rows keep the name they were made under, so after a
 * rename a member still owns their old ride, expense or photo. Mirrors `_own_names` in `backend/app/dependencies.py`,
 * which is what actually decides who may delete what.
 */
export function ownNames(me: User | null | undefined, users: User[] = []): string[] {
  if (!me) return [];
  return [me.name, ...ownIdentities(me, users).filter((n) => n !== me.name)];
}

/** Whether a row owned by `owner` (a stored name) is the member's, under any of `myNames`. */
export const isOwnName = (myNames: string[], owner: string | null | undefined): boolean => !!owner && myNames.includes(owner);

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
