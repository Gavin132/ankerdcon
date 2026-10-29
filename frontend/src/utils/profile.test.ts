import { describe, expect, it } from "vitest";
import { contrastRatio, parseHex } from "./color";
import { BANNER_COLORS, NAME_BACKDROP, NAME_COLORS, readableNameColor } from "./profile";

const ratio = (hex: string, backdrop: [number, number, number]) => contrastRatio(parseHex(hex)!, backdrop);

describe("readableNameColor", () => {
  it("keeps a colour that already reads", () => {
    expect(readableNameColor("#be123c", false)).toBe("#be123c");
    expect(readableNameColor("#a78bfa", true)).toBe("#a78bfa");
  });

  it("lightens a dark colour on the dark theme", () => {
    const out = readableNameColor("#2d1b69", true)!;
    expect(out).not.toBe("#2d1b69");
    expect(ratio(out, NAME_BACKDROP.dark)).toBeGreaterThanOrEqual(4.5);
  });

  it("darkens a light colour on the light theme", () => {
    const out = readableNameColor("#a3e635", false)!;
    expect(ratio(out, NAME_BACKDROP.light)).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#a3e635", NAME_BACKDROP.light)).toBeLessThan(4.5);
  });

  it("keeps the hue", () => {
    const [r, g, b] = parseHex(readableNameColor("#2d1b69", true))!;
    // Purple stays purple: blue is the strongest channel and red beats green.
    expect(b).toBeGreaterThan(r);
    expect(r).toBeGreaterThan(g);
  });

  it("makes every preset and banner colour readable in both themes", () => {
    for (const c of [...NAME_COLORS, ...BANNER_COLORS, "#000000", "#ffffff", "#fff", "#808080"]) {
      for (const isDark of [false, true]) {
        const out = readableNameColor(c, isDark)!;
        expect(ratio(out, isDark ? NAME_BACKDROP.dark : NAME_BACKDROP.light)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("gives nothing for no colour or a colour it cannot read", () => {
    expect(readableNameColor("", false)).toBeUndefined();
    expect(readableNameColor(undefined, true)).toBeUndefined();
    expect(readableNameColor("tomato", true)).toBeUndefined();
  });
});
