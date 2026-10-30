import { describe, expect, it } from "vitest";
import { myTicketChoice, notVotedYet, tallyTicketPoll, ticketChoiceOf } from "./ticketPoll";
import { groupPeople } from "./people";
import type { User } from "../types";

const user = (name: string, extra: Partial<User> = {}) => ({ id: name, name, aliases: [], ...extra }) as unknown as User;
const users = [user("Sam", { aliases: ["samdraws"] }), user("Pip"), user("Zoe")];
const options = [
  { id: "o1", label: "Za + Zo", price: 85 },
  { id: "o2", label: "Za", price: 50 },
];

describe("tallyTicketPoll", () => {
  it("groups the voters per choice", () => {
    const tally = tallyTicketPoll(
      { options, votes: [{ voter: "Sam", choice: "o1" }, { voter: "Pip", choice: "o1" }, { voter: "Zoe", choice: "unsure" }] },
      users,
    );
    expect(tally.options.map((o) => o.people.map((p) => p.name))).toEqual([["Sam", "Pip"], []]);
    expect(tally.unsure.map((p) => p.name)).toEqual(["Zoe"]);
    expect(tally.voters).toHaveLength(3);
  });

  it("counts a person who voted under two names once, for the last vote", () => {
    const tally = tallyTicketPoll(
      { options, votes: [{ voter: "samdraws", choice: "o2" }, { voter: "Sam", choice: "o1" }] },
      users,
    );
    expect(tally.voters).toHaveLength(1);
    expect(tally.options[0].people).toHaveLength(1);
    expect(tally.options[1].people).toHaveLength(0);
  });
});

describe("myTicketChoice", () => {
  it("finds the vote under any of my names", () => {
    expect(myTicketChoice({ votes: [{ voter: "samdraws", choice: "o2" }] }, ["Sam", "samdraws"])).toBe("o2");
    expect(myTicketChoice({ votes: [{ voter: "Pip", choice: "o2" }] }, ["Sam"])).toBeNull();
  });
});

describe("ticketChoiceOf", () => {
  it("finds what a person on the list voted, also under another name, and null without a vote", () => {
    const tally = tallyTicketPoll(
      { options, votes: [{ voter: "samdraws", choice: "o2" }, { voter: "Zoe", choice: "unsure" }] },
      users,
    );
    const [sam, pip, zoe] = groupPeople(["Sam", "Pip", "Zoe"], users);
    expect(ticketChoiceOf(tally, sam)).toBe("o2");
    expect(ticketChoiceOf(tally, zoe)).toBe("unsure");
    expect(ticketChoiceOf(tally, pip)).toBeNull();
  });
});

describe("notVotedYet", () => {
  it("lists the trip's people without a vote, whichever name they voted under", () => {
    const people = groupPeople(["Sam", "Pip", "Zoe"], users);
    const tally = tallyTicketPoll({ options, votes: [{ voter: "samdraws", choice: "o1" }] }, users);
    expect(notVotedYet(people, tally).map((p) => p.name)).toEqual(["Pip", "Zoe"]);
  });
});
