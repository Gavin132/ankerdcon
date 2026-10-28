/* Opens every screen in scripts/audit-screens.mjs on the app's mock mode at phone sizes, runs the in-page layout
 * check (src/dev/audit.ts) and writes what it found: which text an overflow:hidden parent cuts off, what runs
 * past the edge of the screen, which controls are too small to hit. Screenshots of every screen are kept too.
 *
 *   npm run mobile-audit                         the default set: 320 and 390 px wide, light, "upcoming"
 *   npm run mobile-audit -- --full               320 360 390 430 px, light and dark, all three scenarios
 *   npm run mobile-audit -- --only trip,finance  only screens whose name contains one of these
 *   npm run mobile-audit -- --widths 360 --themes dark --info
 *   npm run mobile-audit -- --browser webkit     Safari's engine (default: chromium)
 *   npm run mobile-audit -- --selftest           checks the check itself on deliberately broken elements
 *   npm run mobile-audit -- --url http://localhost:5173 --out playwright-out/audit
 *
 * Needs the dev server (`npm run dev`) and a browser for Playwright (`npx playwright install chromium`).
 * Exit code 1 when there are errors, so it can guard a change. See docs/local-development.md#mock-mode. */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium, webkit } from "playwright";
import { screens } from "./audit-screens.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const list = (name, fallback) => String(option(name, fallback)).split(",").map((s) => s.trim()).filter(Boolean);

const full = flag("--full");
const base = option("--url", "http://localhost:5173").replace(/\/$/, "");
const widths = list("--widths", full ? "320,360,390,430" : "320,390").map(Number);
const themes = list("--themes", full ? "light,dark" : "light");
const scenarios = list("--scenarios", full ? "upcoming,live,past" : "upcoming");
const only = list("--only", "");
const out = option("--out", "playwright-out/audit");
const showInfo = flag("--info");
const concurrency = Number(option("--jobs", "4"));
const engine = option("--browser", "chromium") === "webkit" ? webkit : chromium;

mkdirSync(`${out}/shots`, { recursive: true });
const chosen = screens.filter((s) => only.length === 0 || only.some((o) => s.name.includes(o)));

// One job per screen × scenario (a screen that fixes its own is run once) × width × theme.
const jobs = [];
for (const screen of chosen) {
  for (const scenario of screen.scenario ? [screen.scenario] : scenarios) {
    for (const width of widths) for (const theme of themes) jobs.push({ screen, scenario, width, theme });
  }
}

/** Playwright wants the browser build of its own version; when only an older one is installed (a new Playwright
 * not yet followed by `npx playwright install`), the newest installed one is used instead: close enough for
 * measuring a layout. */
function installedBrowser() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
    ?? (process.platform === "win32" ? join(process.env.LOCALAPPDATA ?? homedir(), "ms-playwright")
      : process.platform === "darwin" ? join(homedir(), "Library/Caches/ms-playwright") : join(homedir(), ".cache/ms-playwright"));
  if (!existsSync(root)) return null;
  const exe = process.platform === "win32" ? "chrome-headless-shell.exe" : "chrome-headless-shell";
  const folder = process.platform === "win32" ? "chrome-headless-shell-win64" : process.platform === "darwin" ? "chrome-headless-shell-mac-arm64" : "chrome-headless-shell-linux64";
  const found = readdirSync(root).filter((d) => d.startsWith("chromium_headless_shell-")).sort().reverse()
    .map((d) => join(root, d, folder, exe)).find((p) => existsSync(p));
  return found ?? null;
}

let browser;
try {
  browser = await engine.launch();
} catch (e) {
  const fallback = engine === chromium ? installedBrowser() : null;
  if (!fallback) throw e;
  console.log(`Using the installed browser at ${fallback} (run \`npx playwright install chromium\` for the one this Playwright expects).`);
  browser = await engine.launch({ executablePath: fallback });
}

/** The check, checked: elements broken on purpose must be found, and fine ones (a scroller, an ellipsis) left alone. */
async function selftest() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  await page.goto(`${base}/crew?mock`);
  await page.waitForFunction(() => typeof window.__audit === "function");
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    document.body.insertAdjacentHTML("beforeend", `
      <div id="cut-x" style="position:absolute;top:100px;left:10px;width:50px;overflow:hidden;white-space:nowrap;font-size:14px">A long piece of text that is cut off</div>
      <div id="cut-y" style="position:absolute;top:140px;left:10px;width:80px;height:12px;overflow:hidden;font-size:14px;line-height:20px">Cut off vertically</div>
      <div id="off" style="position:absolute;top:180px;left:300px;white-space:nowrap;font-size:14px">Text that runs off the right edge of the screen</div>
      <button id="tiny" style="position:absolute;top:220px;left:10px;width:20px;height:20px">x</button>
      <div style="position:absolute;top:260px;left:10px;width:120px;height:40px;overflow-y:auto"><div id="scroller" style="height:200px">scrolls, fine<br><br><br>more</div></div>
      <div id="dots" style="position:absolute;top:320px;left:10px;width:60px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:14px">An ellipsis, on purpose</div>`);
  });
  const found = await page.evaluate(() => window.__audit());
  await context.close();
  const has = (kind, id, severity) => found.some((f) => f.kind === kind && f.where.includes(`#${id}`) && (!severity || f.severity === severity));
  const checks = [
    ["text cut off sideways", has("clipped-text", "cut-x", "error")],
    ["text cut off at the bottom", has("clipped-text", "cut-y", "error")],
    ["text past the screen edge", has("offscreen", "off", "error")],
    ["a control too small to hit", has("small-tap-target", "tiny")],
    ["a scrolling box is fine", !found.some((f) => f.where.includes("#scroller"))],
    ["an ellipsis is only mentioned", has("truncated", "dots", "info") && !has("clipped-text", "dots")],
  ];
  for (const [name, ok] of checks) console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
  await browser.close();
  process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
}
if (flag("--selftest")) await selftest();

const results = [];
let next = 0;

async function run({ screen, scenario, width, theme }) {
  const label = `${screen.name} @${width} ${theme} ${scenario}`;
  const context = await browser.newContext({
    viewport: { width, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: theme,
  });
  await context.addInitScript((t) => {
    try {
      localStorage.setItem("ankerd-theme", t);
      sessionStorage.removeItem("ankerd_mock");
    } catch {}
  }, theme);
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(`script error: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !/interactive-widget|favicon|Failed to load resource/.test(m.text()) && problems.push(`console: ${m.text().slice(0, 160)}`));
  const result = { label, screen: screen.name, scenario, width, theme, findings: [], problems, stepError: null, unhandled: [] };
  try {
    const sep = screen.path.includes("?") ? "&" : "?";
    await page.goto(`${base}${screen.path}${sep}mock&scenario=${scenario}&role=${screen.role ?? "member"}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.__audit === "function", null, { timeout: 15000 });
    // Data, images and the entrance animations have settled.
    await page.waitForTimeout(1800);
    if (screen.steps) {
      try {
        await screen.steps(page);
      } catch (e) {
        result.stepError = String(e.message).split("\n")[0];
      }
    }
    await page.waitForTimeout(600);
    result.findings = await page.evaluate(() => window.__audit());
    result.unhandled = await page.evaluate(() => window.__mock?.unhandled ?? []);
    await page.screenshot({ path: `${out}/shots/${screen.name}-${width}-${theme}-${scenario}.png`, fullPage: false });
  } catch (e) {
    problems.push(`could not load: ${String(e.message).split("\n")[0]}`);
  } finally {
    await context.close();
  }
  results.push(result);
  process.stdout.write(`${results.length}/${jobs.length}  ${label}  ${result.findings.filter((f) => f.severity === "error").length} errors\n`);
}

await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (next < jobs.length) await run(jobs[next++]);
  }),
);
await browser.close();

// ── The report: each finding once per screen, with the widths and themes it appeared at ─────────────────────
const wanted = (f) => showInfo || f.severity !== "info";
const byScreen = new Map();
for (const r of results) {
  const entry = byScreen.get(r.screen) ?? { findings: new Map(), problems: new Set(), unhandled: new Set(), stepErrors: new Set() };
  byScreen.set(r.screen, entry);
  for (const f of r.findings.filter(wanted)) {
    const key = `${f.kind}|${f.where}|${f.detail.replace(/\d+(\.\d+)?px/g, "Npx")}`;
    const seen = entry.findings.get(key) ?? { ...f, at: new Set() };
    seen.at.add(`${r.width}${r.theme === "dark" ? "d" : ""}${r.scenario === "upcoming" ? "" : `/${r.scenario}`}`);
    entry.findings.set(key, seen);
  }
  r.problems.forEach((p) => entry.problems.add(p));
  r.unhandled.forEach((u) => entry.unhandled.add(u));
  if (r.stepError) entry.stepErrors.add(r.stepError);
}

const order = { error: 0, warn: 1, info: 2 };
let errors = 0;
const md = [`# Mobile audit`, ``, `${new Date().toISOString()} · widths ${widths.join(", ")} · themes ${themes.join(", ")} · scenarios ${scenarios.join(", ")} · ${results.length} pages`, ``];
for (const [name, e] of [...byScreen].sort(([a], [b]) => a.localeCompare(b))) {
  const fs = [...e.findings.values()].sort((a, b) => order[a.severity] - order[b.severity] || a.kind.localeCompare(b.kind));
  errors += fs.filter((f) => f.severity === "error").length;
  if (fs.length === 0 && e.problems.size === 0 && e.stepErrors.size === 0 && e.unhandled.size === 0) continue;
  md.push(`## ${name}`, ``);
  for (const f of fs) md.push(`- **${f.severity}** ${f.kind} · \`${f.where}\` · ${f.text ? `"${f.text}" · ` : ""}${f.detail} · at ${[...f.at].join(", ")}`);
  for (const p of e.problems) md.push(`- problem: ${p}`);
  for (const s of e.stepErrors) md.push(`- step failed: ${s}`);
  for (const u of e.unhandled) md.push(`- no mock for GET ${u}`);
  md.push(``);
}
writeFileSync(`${out}/report.md`, md.join("\n"));
writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 1));
const kinds = {};
for (const e of byScreen.values()) for (const f of e.findings.values()) kinds[`${f.severity} ${f.kind}`] = (kinds[`${f.severity} ${f.kind}`] ?? 0) + 1;
console.log(`\n${Object.entries(kinds).sort().map(([k, n]) => `${n}× ${k}`).join(" · ") || "nothing found"}`);
console.log(`${errors} error(s). Report: ${out}/report.md · screenshots: ${out}/shots/`);
process.exit(errors > 0 ? 1 : 0);
