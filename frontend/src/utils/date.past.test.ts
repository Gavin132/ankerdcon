import { afterEach, describe, expect, it } from "vitest";
import { isBeforeToday } from "./date";
import { useTimeStore } from "../store/time.store";

describe("isBeforeToday", () => {
  afterEach(() => useTimeStore.getState().setOverride(null));

  it("is true for an earlier day and false for today or later, by the app's clock", () => {
    useTimeStore.getState().setOverride(new Date(2026, 10, 21, 15, 0));
    expect(isBeforeToday("2026-11-20 23:59")).toBe(true);
    expect(isBeforeToday("2026-11-21 08:00")).toBe(false);
    expect(isBeforeToday("2026-11-21T08:00:00")).toBe(false);
    expect(isBeforeToday("2026-11-22 09:00")).toBe(false);
    expect(isBeforeToday("")).toBe(false);
  });
});
