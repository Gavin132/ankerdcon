import { describe, expect, it } from "vitest";
import { menuPlacement } from "./NamePicker";

describe("menuPlacement", () => {
  it("goes under the input when there is room for the whole list", () => {
    expect(menuPlacement(100, 150, 800)).toEqual({ side: "below", maxHeight: 220 });
  });

  it("goes above the input when the window ends right under it and there is more room above", () => {
    expect(menuPlacement(340, 390, 496)).toEqual({ side: "above", maxHeight: 220 });
  });

  it("stays under the input and shrinks to the room left when that is still the bigger side", () => {
    const placement = menuPlacement(60, 110, 300);
    expect(placement.side).toBe("below");
    expect(placement.maxHeight).toBe(178);
  });

  it("never gets smaller than a few rows, even in a very short window", () => {
    expect(menuPlacement(20, 70, 90).maxHeight).toBe(96);
  });
});
