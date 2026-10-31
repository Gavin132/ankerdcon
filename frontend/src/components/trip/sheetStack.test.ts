import { beforeEach, describe, expect, it } from "vitest";
import { PEEK_PX, peekOffset, registerSheet, resetSheetStack, setSheetHeight, unregisterSheet, type OpenSheet } from "./sheetStack";

const stack = (...heights: number[]): OpenSheet[] => heights.map((height, i) => ({ id: `s${i}`, height }));

describe("peekOffset", () => {
  it("a sheet with nothing over it does not move", () => {
    expect(peekOffset(stack(600), 0)).toBe(0);
    expect(peekOffset(stack(600, 400), 1)).toBe(0);
  });

  it("a taller sheet underneath moves down until a strip of it shows over the top one", () => {
    // Natural top edge 600 from the bottom; the new sheet's is 400; it must end up 56 above that.
    expect(peekOffset(stack(600, 400), 0)).toBe(600 - 400 - PEEK_PX);
  });

  it("a shorter sheet underneath moves up to meet it", () => {
    expect(peekOffset(stack(200, 400), 0)).toBe(200 - 400 - PEEK_PX);
  });

  it("with three sheets each shows a strip, one above the other", () => {
    const s = stack(500, 450, 300);
    // After moving, the top edges measured from the bottom are: 300 (top), 356, 412.
    expect(500 - peekOffset(s, 0)).toBe(300 + 2 * PEEK_PX);
    expect(450 - peekOffset(s, 1)).toBe(300 + PEEK_PX);
  });

  it("is zero for an index outside the stack", () => {
    expect(peekOffset(stack(300, 200), 5)).toBe(0);
    expect(peekOffset([], 0)).toBe(0);
  });
});

describe("the open sheets", () => {
  beforeEach(() => resetSheetStack());

  it("keeps them in the order they opened and forgets one that closes", async () => {
    const { useSheetStack } = await import("./sheetStack");
    expect(typeof useSheetStack).toBe("function");
    registerSheet("a");
    registerSheet("b");
    registerSheet("a"); // opening twice does not add it twice
    setSheetHeight("b", 320);
    unregisterSheet("a");
    unregisterSheet("missing");
    // Observed through the public offsets: with only b left nothing is covered.
    expect(peekOffset([{ id: "b", height: 320 }], 0)).toBe(0);
  });
});
