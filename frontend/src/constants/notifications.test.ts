import { describe, expect, it } from "vitest";
import { activePreset, applyPreset, categoriesFor, categoriesToSave, IMPORTANT_CATEGORY_IDS, NOTIFICATION_CATEGORIES } from "./notifications";

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

describe("the admin-only notifications", () => {
  const ids = (isAdmin: boolean) => categoriesFor(isAdmin).map((c) => c.id);

  it("are offered to an admin and to nobody else", () => {
    for (const id of ["feedback_submitted", "new_user"]) {
      expect(ids(true)).toContain(id);
      expect(ids(false)).not.toContain(id);
    }
  });

  it("'Nieuwe gebruiker' is an admin category that no preset switches on by itself", () => {
    expect(NOTIFICATION_CATEGORIES.find((c) => c.id === "new_user")).toMatchObject({ adminOnly: true, group: "admin" });
    for (const preset of ["all", "important"] as const) {
      expect(applyPreset(preset, [], true)).not.toContain("new_user");
    }
    expect(applyPreset("all", ["new_user"], true)).toContain("new_user");
    expect(applyPreset("none", ["new_user"], true)).toContain("new_user");
  });

  it("is saved for an admin, and left out for a member who kept it from when they were one", () => {
    expect(categoriesToSave(["ride_created", "new_user"], true)).toEqual(["ride_created", "new_user"]);
    expect(categoriesToSave(["ride_created", "new_user", "feedback_submitted"], false)).toEqual(["ride_created"]);
  });
});
