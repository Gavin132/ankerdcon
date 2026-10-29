import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The button height scale lives in index.css and nowhere else (docs/design-system.md#buttons): standard 44 px on a phone and
// 40 px from `lg` up, compact (`.btn-compact`) 40 and 36. This keeps it from drifting: a caller that sets its own height,
// vertical padding or text size on a `.btn-*` button fails here, and `npm run mobile-audit -- --buttons` measures the result.
const src = fileURLToPath(new URL(".", import.meta.url));
const css = readFileSync(join(src, "index.css"), "utf8");

describe("button height scale", () => {
  it("sets the standard and compact heights in index.css", () => {
    const family = css.match(/\.btn-danger-soft\s*\{\s*@apply[^;]*;/);
    expect(family?.[0]).toContain("min-h-[44px]");
    expect(family?.[0]).toContain("lg:min-h-10");
    const compact = css.match(/\.btn-compact\s*\{[^}]*\}/);
    expect(compact?.[0]).toContain("min-h-10");
    expect(compact?.[0]).toContain("lg:min-h-9");
  });

  it("lets no caller set its own height, vertical padding or text size on a button", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.tsx?$/.test(name) && !name.endsWith(".test.ts")) files.push(path);
      }
    };
    walk(src);
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/"([^"\n]*\bbtn-(?:primary|secondary|tonal|ghost|danger-soft|danger)\b[^"\n]*)"/g)) {
        const bad = m[1].split(/\s+/).filter((c) => /^(?:[a-z]+:)?(?:!?min-h-|!?h-\d|!?py-|!?text-(?:xs|sm|base|\[\d))/.test(c));
        if (bad.length) offenders.push(`${file.slice(src.length)}: "${m[1]}" sets ${bad.join(", ")}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
