/* Opens the app in Playwright's WebKit (Safari's engine) with an iPhone profile: prints every
 * script error, failed request and whether the "kan niet starten" screen showed, and saves a
 * screenshot. Not real iOS (no Safari toolbar, no safe areas, no PWA), but it catches what breaks in
 * WebKit and at phone size. See docs/local-development.md#testing-in-webkit-iphone.
 *
 *   npm run ios-check                          the login page of http://localhost:5173
 *   npm run ios-check -- /trips                another path
 *   npm run ios-check -- / --device "iPhone SE" --url https://dev.ankerd.org
 *   npm run ios-check -- --list                the device names Playwright knows
 */
import { mkdirSync } from "node:fs";
import { webkit, devices } from "playwright";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};

if (args.includes("--list")) {
  console.log(Object.keys(devices).filter((d) => /iPhone|iPad/.test(d) && !/landscape/.test(d)).join("\n"));
  process.exit(0);
}

const base = option("--url", "http://localhost:5173").replace(/\/$/, "");
const deviceName = option("--device", "iPhone 13");
const path = args.find((a, i) => a.startsWith("/") && args[i - 1] !== "--url") ?? "/login";
const device = devices[deviceName];
if (!device) {
  console.error(`Unknown device "${deviceName}". Try: npm run ios-check -- --list`);
  process.exit(1);
}

const browser = await webkit.launch();
const page = await (await browser.newContext({ ...device })).newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`script error: ${e.message}`));
// WebKit does not know `interactive-widget` in the viewport tag and says so; harmless.
page.on("console", (m) => m.type() === "error" && !m.text().includes("interactive-widget") && problems.push(`console error: ${m.text().slice(0, 200)}`));
page.on("requestfailed", (r) => problems.push(`request failed: ${r.url().slice(0, 120)} (${r.failure()?.errorText})`));

await page.goto(base + path, { waitUntil: "load" });
await page.waitForTimeout(3000); // React, the splash and the first requests

const cannotStart = await page.getByText("Ankerd Con kan niet starten").count();
mkdirSync("playwright-out", { recursive: true });
const file = `playwright-out/${deviceName.replace(/\W+/g, "-")}${path.replace(/\W+/g, "-")}.png`;
await page.screenshot({ path: file, fullPage: false });

console.log(`${deviceName} · ${base}${path}`);
console.log(cannotStart ? "!! the 'kan niet starten' screen is showing" : "app rendered");
console.log(problems.length ? problems.map((p) => `  - ${p}`).join("\n") : "no errors");
console.log(`screenshot: ${file}`);
await browser.close();
process.exit(cannotStart || problems.some((p) => p.startsWith("script error")) ? 1 : 0);
