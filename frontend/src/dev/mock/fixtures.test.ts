import { describe, expect, it } from "vitest";
import { buildFixtures, type Role, type Scenario } from "./fixtures";
import { dateKey } from "./time";

const scenarios: Scenario[] = ["upcoming", "live", "past"];

describe.each(scenarios)("the made-up data (%s)", (scenario) => {
  const fx = buildFixtures(scenario, "member");
  const userNames = new Set(fx.users.flatMap((u) => [u.name, u.discord_username, ...(u.aliases ?? [])]));
  const dayIds = new Set(fx.calendar.map((d) => d.id));
  const mealIds = new Set(fx.meals.map((m) => m.id));

  it("has everyone the lists name as a member", () => {
    const named = [
      ...fx.calendar.flatMap((d) => d.participants),
      ...fx.meals.flatMap((m) => m.participants),
      ...fx.rides.flatMap((r) => [r.driver, ...r.passengers].filter(Boolean)),
      ...fx.rooms.flatMap((r) => r.occupants),
      ...fx.cosplays.map((c) => c.user_name),
      ...fx.expenses.flatMap((e) => [e.paid_by, ...e.shares.map((s) => s.participant)]),
    ];
    expect(named.filter((n) => !userNames.has(n))).toEqual([]);
  });

  it("links activities and rides to days and activities that exist", () => {
    expect(fx.meals.filter((m) => m.linked_event_id && !dayIds.has(m.linked_event_id))).toEqual([]);
    expect(fx.rides.filter((r) => r.linked_event_id && !dayIds.has(r.linked_event_id))).toEqual([]);
    expect(fx.rides.filter((r) => r.linked_meal_id && !mealIds.has(r.linked_meal_id))).toEqual([]);
  });

  it("keeps the seat counts of a ride true", () => {
    for (const r of fx.rides.filter((x) => x.direction !== "Restaurant" && !x.is_public_transport)) {
      expect(r.passengers.length).toBeLessThanOrEqual(r.total_seats);
      expect(r.seats_left).toBe(r.total_seats - r.passengers.length);
    }
  });

  it("puts the main trip where the scenario says", () => {
    const today = dateKey(0);
    const days = fx.calendar.filter((d) => d.multi_day_id === fx.mainTripId).map((d) => d.date).sort();
    if (scenario === "upcoming") expect(days[0] > today).toBe(true);
    if (scenario === "live") expect(days[0] < today && days[days.length - 1] > today).toBe(true);
    if (scenario === "past") expect(days[days.length - 1] < today).toBe(true);
  });

  it("has the awkward cases the layout checks need", () => {
    expect(fx.users.some((u) => u.name.length > 30)).toBe(true);
    expect(fx.rides.some((r) => r.is_full)).toBe(true);
    expect(fx.meals.some((m) => m.meal_name.length > 50)).toBe(true);
    const partial = fx.calendar.filter((d) => d.multi_day_id === fx.mainTripId);
    expect(new Set(partial.map((d) => d.participants.length)).size).toBeGreaterThan(1);
  });
});

describe("the roles", () => {
  it.each([["member", false, false], ["admin", true, false], ["viewer", false, true]] as [Role, boolean, boolean][])("%s", (role, admin, viewer) => {
    const me = buildFixtures("upcoming", role).me;
    expect(!!me.is_admin).toBe(admin);
    expect(!!me.is_viewer).toBe(viewer);
  });
});
