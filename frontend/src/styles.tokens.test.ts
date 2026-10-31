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
  // the brand fill (primary button, switch, progress, countdown stub ...) and its white label
  ["on-cyan", "cyan", 4.5],
  // the chosen chip and the active tab: ink with paper text in light mode, the brand fill with a white label in dark
  ["selected-on", "selected", 4.5],
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

  it("the brand fill carries a white label, in both themes", () => {
    expect(light["on-cyan"]).toEqual([255, 255, 255]);
    expect(dark["on-cyan"]).toEqual([255, 255, 255]);
    expect(dark.selected).toEqual(dark.cyan);
    expect(dark["selected-on"]).toEqual(dark["on-cyan"]);
  });

  it("the active-tab icon reads on the selected fill in both themes", () => {
    // light: a light tint of the accent on the ink; dark: white on the accent fill
    expect(contrastRatio(light["selected-icon"], light.selected)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark["selected-icon"], dark.selected)).toBeGreaterThanOrEqual(4.5);
  });

  it("the brand fill and the chosen chip stand out from the page in dark mode", () => {
    for (const bg of ["paper", "surface"]) expect(contrastRatio(dark.selected, dark[bg]), bg).toBeGreaterThanOrEqual(3);
  });

  it("white text reads on every avatar fill", () => {
    for (let i = 1; i <= 6; i++) expect(contrastRatio([255, 255, 255], light[`avatar-${i}`])).toBeGreaterThanOrEqual(4.5);
  });

  it("every accent has a fill that carries a white label, text that reads on white and on its tint", () => {
    const white: Rgb = [255, 255, 255];
    // The one-line `[data-accent="x"] { --a: 1 2 3; ... }` blocks, as tokens (a light block, or the `.dark` one).
    const accentTokens = (prefix: string, id: string): Record<string, Rgb> => {
      const line = css.split("\n").find((l) => l.startsWith(`${prefix}[data-accent="${id}"] {`));
      if (!line) throw new Error(`no ${prefix}[data-accent="${id}"] block`);
      const out: Record<string, Rgb> = {};
      for (const m of line.matchAll(/--([\w-]+):\s*(\d+) (\d+) (\d+);/g)) out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
      return out;
    };
    const ids = [...css.matchAll(/^\[data-accent="(\w+)"\]/gm)].map((m) => m[1]);
    expect(ids).toEqual(["teal", "green", "gold", "orange", "pink", "purple"]);
    for (const id of ids) {
      const l = accentTokens("", id);
      expect(contrastRatio(white, l.cyan), `${id} fill vs white`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(l["cyan-text"], white), `${id} text on white`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(l["cyan-text"], l["cyan-soft"]), `${id} text on tint`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(l["selected-icon"], light.selected), `${id} icon on the ink tab`).toBeGreaterThanOrEqual(4.5);
      const d = accentTokens(".dark", id);
      expect(d.selected, `${id} dark chip is the fill`).toEqual(l.cyan);
      expect(d["selected-icon"], `${id} dark tab icon is white`).toEqual(white);
      expect(contrastRatio(white, d.selected), `${id} dark chip vs white`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(d["cyan-text"], dark.surface), `${id} dark text on a card`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(d["cyan-text"], d["cyan-soft"]), `${id} dark text on tint`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(d.selected, dark.surface), `${id} dark fill vs a card`).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps the backdrops the name colour helper assumes in sync with the page", () => {
    expect(NAME_BACKDROP.light).toEqual(light.paper);
    expect(NAME_BACKDROP.dark).toEqual(dark.surface);
  });
});
