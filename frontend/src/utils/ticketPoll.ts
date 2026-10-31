import { groupPeople, isIn, type Person } from "./people";
import type { TicketPoll, TicketPollOption, User } from "../types";

/** Besides a ticket, a member can say they do not know yet. Somebody who is not going just does not vote. */
export const VOTE_UNSURE = "unsure";

export interface TicketTally {
  /** Every ticket of the vote with the people who want it, in the order of the vote. */
  options: { option: TicketPollOption; people: Person[] }[];
  unsure: Person[];
  /** Everyone who has voted, each once. */
  voters: Person[];
}

/**
 * The votes as people per choice. A vote is stored under a name, and one person can have voted under two (a
 * rename, a Discord username), so they are counted once, for the choice that came last.
 */
export function tallyTicketPoll(poll: Pick<TicketPoll, "options" | "votes">, users: User[]): TicketTally {
  const voters = groupPeople(poll.votes.map((v) => v.voter), users);
  const personOf = new Map<string, Person>();
  for (const person of voters) for (const name of person.names) personOf.set(name, person);

  const choiceOf = new Map<Person, string>();
  for (const vote of poll.votes) {
    const person = personOf.get(vote.voter);
    if (person) choiceOf.set(person, vote.choice);
  }
  const who = (choice: string) => voters.filter((p) => choiceOf.get(p) === choice);
  return {
    options: poll.options.map((option) => ({ option, people: who(option.id) })),
    unsure: who(VOTE_UNSURE),
    voters,
  };
}

/** What `person` (somebody on a trip's list) voted, under whichever name: a choice, or null when they have not. */
export function ticketChoiceOf(tally: Pick<TicketTally, "options" | "unsure">, person: Person): string | null {
  const same = (voter: Person) => isIn(voter, person.identities);
  const hit = tally.options.find((o) => o.people.some(same));
  if (hit) return hit.option.id;
  return tally.unsure.some(same) ? VOTE_UNSURE : null;
}

/** What the signed-in member voted: a choice, or null when they have not. */
export function myTicketChoice(poll: Pick<TicketPoll, "votes">, myNames: string[]): string | null {
  const mine = poll.votes.filter((v) => myNames.includes(v.voter));
  return mine.length > 0 ? mine[mine.length - 1].choice : null;
}

/** Those of `people` (a trip's sign-ups) who have not voted yet. */
export function notVotedYet(people: Person[], tally: Pick<TicketTally, "voters">): Person[] {
  const voted = new Set<string>();
  for (const v of tally.voters) for (const identity of v.identities) voted.add(identity);
  return people.filter((p) => !isIn(p, voted));
}
