// Fails when a colour is written by hand instead of coming from the tokens in src/index.css
// (docs/design-system.md, "Colours"). Run it with `npm run check-colors`.
//
// Flagged in every .ts/.tsx file under src and in src/index.css:
//   - a Tailwind palette class: bg-rose-100, text-amber-800, border-emerald-300/40, from-violet-500 ...,
//     and bg-white / text-black (use bg-surface, text-hero-ink, bg-scrim, text-avatar-on, ...)
//   - a hex colour (#fff, #0F1519) or an rgb()/hsl() with numbers in it
//   - a `dark:` class: the tokens in index.css switch with the theme by themselves, so a `dark:` twin means a token is missing
// Not flagged, but counted: the `slate` and `sky` scales. They are remapped to the brand greys and the brand
// blue in tailwind.config.ts, so they already follow the brand; new code should still use the semantic tokens
// (ink, surface, line, brand ...), which also follow dark mode.

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const src = join(root, "src");

/**
 * The places where a hard-coded colour is right. `kinds` says which of "palette" | "hex" | "rgb" | "dark" the
 * file may contain; every entry says why. Add a line here (with a reason) instead of working around the check.
 */
const ALLOWED = [
  { file: /^src\/dev\//, kinds: ["palette", "hex", "rgb", "dark"], reason: "mock data and fixtures for ?mock mode", always: true },
  { file: /\.test\.tsx?$/, kinds: ["palette", "hex", "rgb", "dark"], reason: "tests", always: true },
  { file: /^src\/utils\/profile\.ts$/, kinds: ["hex"], reason: "NAME_COLORS and BANNER_COLORS: the colours members can pick, stored as data" },
  { file: /^src\/pages\/ProfilePage\.tsx$/, kinds: ["hex"], reason: "colour the picker starts from when the member has none yet" },
  { file: /^src\/pages\/admin\/AdminUsersPage\.tsx$/, kinds: ["hex"], reason: "example in the placeholder of the colour field" },
  { file: /^src\/store\/theme\.store\.ts$/, kinds: ["hex"], reason: "swatches of the accent picker; the accents themselves are the [data-accent] blocks in index.css" },
  { file: /^src\/components\/auth\/LoginForm\.tsx$/, kinds: ["hex"], reason: "the Google logo's own colours" },
  { file: /^src\/App\.tsx$/, kinds: ["hex"], reason: "theme-color meta tag: the browser chrome needs a literal colour" },
  { file: /^src\/components\/crew\/CrewMap\.tsx$/, kinds: ["hex", "rgb"], reason: "map pins are Leaflet HTML drawn on map tiles that have their own fixed colours" },
  { file: /^src\/components\/story\/StoryViewer\.tsx$/, kinds: ["rgb"], reason: "framer-motion animates between two literal colours (the scrim while dragging)" },
  { file: /^src\/utils\/videoPoster\.ts$/, kinds: ["hex"], reason: "canvas drawing, outside the DOM and its CSS variables" },
  { file: /^src\/pages\/SettingsPage\.tsx$/, kinds: ["palette", "hex"], reason: "the QR code is black on white so a scanner can read it, in dark mode too" },
];

// Anything inside these markers in index.css is skipped, each with its reason.
const CSS_ALLOWED = /\/\* colours:allowed:start[^*]*\*\/[\s\S]*?\/\* colours:allowed:end \*\//g;

const PROPS = "bg|text|border|border-[trblxy]|ring|ring-offset|fill|stroke|from|to|via|divide|outline|decoration|placeholder|accent|caret|shadow";
const HUES = "red|orange|amber|yellow|lime|green|emerald|teal|cyan|blue|indigo|violet|purple|fuchsia|pink|rose|gray|zinc|neutral|stone";
const PALETTE = new RegExp(String.raw`(?<![\w-])(?:[a-z0-9-]+:)*!?(?:${PROPS})-(?:(?:${HUES})(?:-\d{2,3})?|white|black)(?:/\d+)?(?![\w-])`, "g");
const SCALE = new RegExp(String.raw`(?<![\w-])(?:[a-z0-9-]+:)*!?(?:${PROPS})-(slate|sky)-\d{2,3}(?:/\d+)?(?![\w-])`, "g");
const HEX = /(?<![\w&%])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;
const RGB = /\b(?:rgba?|hsla?)\(\s*\d/g;
const DARK = /(?<![\w-])dark:[\w\[!-]/g;

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name) || p === join(src, "index.css")) out.push(p);
  }
  return out;
}

const violations = [];
const scale = { slate: { n: 0, files: new Set() }, sky: { n: 0, files: new Set() } };
const used = new Set();

for (const path of walk(src)) {
  const rel = relative(root, path).split(sep).join("/");
  let text = readFileSync(path, "utf8");
  if (rel === "src/index.css") {
    // Blank the allowed blocks and every comment (keeping the line numbers).
    const blank = (m) => m.replace(/[^\n]/g, " ");
    text = text.replace(CSS_ALLOWED, blank).replace(/\/\*[\s\S]*?\*\//g, blank);
  }
  const entries = ALLOWED.filter((a) => a.file.test(rel));
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    // Token definitions in index.css (--ink: 15 21 25; /* #0F1519 */) are the one place the values live.
    const code = rel === "src/index.css" && /^\s*--[\w-]+:/.test(line) ? "" : line;
    for (const m of code.matchAll(SCALE)) {
      scale[m[1]].n++;
      scale[m[1]].files.add(rel);
    }
    const check = (kind, re) => {
      const entry = entries.find((a) => a.kinds.includes(kind));
      for (const m of code.matchAll(re)) {
        if (entry) used.add(entry);
        else violations.push({ rel, line: i + 1, kind, text: m[0] });
      }
    };
    check("palette", PALETTE);
    check("hex", HEX);
    check("rgb", RGB);
    check("dark", DARK);
  });
}

const sum = (k) => `${scale[k].n} in ${scale[k].files.size} files`;
console.log(`Approved scales (remapped in tailwind.config.ts): slate ${sum("slate")}, sky ${sum("sky")}.`);
console.log("New code uses the semantic tokens (docs/design-system.md, \"Colours\").");
console.log("No `dark:` classes: a colour that changes with the theme is a token.");
console.log(`Allowed exceptions (${ALLOWED.length}):`);
for (const a of ALLOWED) console.log(`  ${a.file.source.replace(/\\\//g, "/")}  [${a.kinds.join(", ")}]  ${a.reason}`);

const unusedAllowed = ALLOWED.filter((a) => !a.always && !used.has(a));
if (unusedAllowed.length) {
  console.error("\nThese ALLOWED entries no longer cover any colour; remove them:");
  for (const a of unusedAllowed) console.error(`  ${a.file}`);
}

if (violations.length) {
  console.error(`\n${violations.length} hard-coded colour${violations.length === 1 ? "" : "s"}:`);
  for (const v of violations) console.error(`  ${v.rel}:${v.line}  ${v.kind}  ${v.text}`);
  console.error("\nUse a token from src/index.css (text-ok, bg-bad-soft, bg-scrim/50, text-hero-ink ...) or, if the colour really is data,");
  console.error("add the file to ALLOWED in scripts/check-colors.mjs with a reason.");
}
process.exit(violations.length || unusedAllowed.length ? 1 : 0);
