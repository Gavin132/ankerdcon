import { describe, expect, it } from "vitest";
import { sortAnnouncements } from "./announcements";

const a = (id: string, severity: "info" | "warning" | "urgent", created_at?: string) => ({ id, severity, created_at });

describe("sortAnnouncements", () => {
  it("puts urgent first, then warning, then info", () => {
    const sorted = sortAnnouncements([a("i", "info", "2026-10-03"), a("u", "urgent", "2026-10-01"), a("w", "warning", "2026-10-02")]);
    expect(sorted.map((x) => x.id)).toEqual(["u", "w", "i"]);
  });

  it("puts the newest first within one severity", () => {
    const sorted = sortAnnouncements([a("old", "info", "2026-10-01T10:00:00Z"), a("new", "info", "2026-10-02T10:00:00Z"), a("mid", "info", "2026-10-01T18:00:00Z")]);
    expect(sorted.map((x) => x.id)).toEqual(["new", "mid", "old"]);
  });

  it("keeps the incoming order for ones without a date, after the dated ones", () => {
    const sorted = sortAnnouncements([a("x", "info"), a("dated", "info", "2026-10-01"), a("y", "info")]);
    expect(sorted.map((x) => x.id)).toEqual(["dated", "x", "y"]);
  });

  it("does not change the list it was given", () => {
    const input = [a("i", "info"), a("u", "urgent")];
    sortAnnouncements(input);
    expect(input.map((x) => x.id)).toEqual(["i", "u"]);
  });
});
