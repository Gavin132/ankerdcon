import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextMealText } from "./TripTiles";

describe("nextMealText", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 25, 14, 0)); // Friday
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("says 'Straks' for a meal later today", () => {
    expect(nextMealText("2026-09-25 21:45")).toBe("Straks 21:45");
  });

  it("names the day for a meal on another day", () => {
    expect(nextMealText("2026-09-27 21:45")).toMatch(/^Volgende: .+ 21:45$/);
    expect(nextMealText("2026-09-27 21:45")).not.toContain("Straks");
  });
});
