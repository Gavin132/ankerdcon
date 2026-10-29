import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio, type Rgb } from "./utils/color";
import { NAME_BACKDROP } from "./utils/profile";

// Reads the colour tokens out of index.css and checks the pairs the UI puts on top of each other, in both
// themes. Adding a token pair that does not read fails here instead of on somebody's phone.
const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");

function tokens(selector: string): Record<string, Rgb> {
  const start = css.indexOf(`\n${selector} {`);
  const body = css.slice(start, css.indexOf("\n}", start));
  const out: Record<string, Rgb> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(\d+) (\d+) (\d+);/g)) out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  return out;
}

const light = tokens(":root");
const dark = { ...light, ...tokens(".dark") };
const themes = { light, dark } as const;

const pairs: [string, string, number][] = [
  // text on the page, a card, a well
  ...["paper", "surface", "sunken"].flatMap((bg): [string, string, number][] => [["ink", bg, 7], ["ink-2", bg, 4.5], ["ink-3", bg, 4.5]]),
  ["cyan-text", "surface", 4.5],
  ["cyan-text", "cyan-soft", 4.5],
  ["on-cyan", "cyan", 4.5],
  // status text on its tint, on a card and on a well
  ...["ok", "warn", "bad"].flatMap((s): [string, string, number][] => [[s, `${s}-soft`, 4.5], [s, "surface", 4.5], [s, "sunken", 4.5], [`${s}-on`, `${s}-fill`, 4.5]]),
  // text on the always-dark hero
  ["hero-ink", "hero", 7],
  ["hero-warn", "hero", 7],
  ["hero-bad", "hero", 7],
];

describe("colour tokens", () => {
  for (const [name, theme] of Object.entries(themes)) {
    it(`${name}: every text pair is readable`, () => {
      const failures = pairs
        .map(([fg, bg, min]) => ({ fg, bg, min, got: contrastRatio(theme[fg], theme[bg]) }))
        .filter((p) => p.got < p.min);
      expect(failures).toEqual([]);
    });
  }

  it("white text reads on every avatar fill", () => {
    for (let i = 1; i <= 6; i++) expect(contrastRatio([255, 255, 255], light[`avatar-${i}`])).toBeGreaterThanOrEqual(4.5);
  });

  it("the accent colours read as text on white and on their own tint", () => {
    for (const m of css.matchAll(/^\[data-accent="(\w+)"\][^\n]*--cyan-soft: (\d+) (\d+) (\d+); --cyan-text: (\d+) (\d+) (\d+);/gm)) {
      const soft: Rgb = [Number(m[2]), Number(m[3]), Number(m[4])];
      const text: Rgb = [Number(m[5]), Number(m[6]), Number(m[7])];
      expect(contrastRatio(text, [255, 255, 255]), m[1]).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(text, soft), m[1]).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps the backdrops the name colour helper assumes in sync with the page", () => {
    expect(NAME_BACKDROP.light).toEqual(light.paper);
    expect(NAME_BACKDROP.dark).toEqual(dark.surface);
  });
});
