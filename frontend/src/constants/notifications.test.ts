import { describe, expect, it } from "vitest";
import { activePreset, applyPreset, categoriesFor, IMPORTANT_CATEGORY_IDS } from "./notifications";

describe("notification presets", () => {
  it("'none' clears every ordinary category but leaves an admin one alone", () => {
    expect(applyPreset("none", ["ride_created", "meal_created", "feedback_submitted"], true)).toEqual(["feedback_submitted"]);
  });

  it("'all' switches every ordinary category on, once each", () => {
    const result = applyPreset("all", ["ride_created"], false);
    expect(new Set(result).size).toBe(result.length);
    expect(result.sort()).toEqual(categoriesFor(false).map((c) => c.id).sort());
    expect(result).not.toContain("feedback_submitted");
  });

  it("'important' is the short list", () => {
    expect(applyPreset("important", ["ride_created"], false).sort()).toEqual([...IMPORTANT_CATEGORY_IDS].sort());
  });

  it("an admin keeps the feedback notification through any preset", () => {
    for (const preset of ["all", "important", "none"] as const) {
      expect(applyPreset(preset, ["feedback_submitted"], true)).toContain("feedback_submitted");
    }
  });

  it("recognises which preset the choices are, and none when mixed", () => {
    expect(activePreset([], false)).toBe("none");
    expect(activePreset([...IMPORTANT_CATEGORY_IDS], false)).toBe("important");
    expect(activePreset(categoriesFor(false).map((c) => c.id), false)).toBe("all");
    expect(activePreset(["ride_created"], false)).toBeNull();
  });

  it("an admin's own category does not change which preset it is", () => {
    expect(activePreset(["feedback_submitted"], true)).toBe("none");
    expect(activePreset([...IMPORTANT_CATEGORY_IDS, "feedback_submitted"], true)).toBe("important");
  });
});
