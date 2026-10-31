import { describe, expect, it } from "vitest";
import { practicalTopics } from "./practicalInfo";

describe("practicalTopics", () => {
  it("lists what is filled in, in order", () => {
    expect(practicalTopics({ parking_info: "P1", website: "https://x.nl", locker_info: "kluis" }, false)).toEqual(["parkeren", "lockers", "website"]);
  });

  it("counts a ticket sale date alone as the tickets topic", () => {
    expect(practicalTopics({ ticket_sale_start: "2026-12-01T10:00" }, false)).toEqual(["tickets"]);
  });

  it("adds attendance when some people miss days", () => {
    expect(practicalTopics({}, true)).toEqual(["aanwezigheid"]);
  });

  it("is empty for nothing", () => {
    expect(practicalTopics({ ticket_types: [] }, false)).toEqual([]);
  });
});
