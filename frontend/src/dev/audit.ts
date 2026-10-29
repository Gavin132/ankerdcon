/**
 * A mobile layout check that runs in the page (`window.__audit()`), used by `scripts/mobile-audit.mjs` and by hand
 * from the console. It looks for what is hard to see by eye and easy to measure:
 *
 *   - text that an `overflow: hidden` parent cuts off, even by a pixel (the "cut off a tiny bit" kind), and the same
 *     for what is not text: a button, an icon or a badge with a corner or a ring shaved off;
 *   - text and boxes that run past the edge of the screen, and a page that scrolls sideways;
 *   - controls too small to hit (under 44 px, counting the invisible `hit-area` box);
 *   - text under 12 px, and pictures that failed to load.
 *
 * Development only (loaded by dev/mock). It reads the page and changes nothing.
 */
export type Severity = "error" | "warn" | "info";

export interface Finding {
  kind: "clipped-text" | "clipped-box" | "offscreen" | "page-scrolls-sideways" | "small-tap-target" | "small-text" | "broken-image" | "truncated";
  severity: Severity;
  /** A short path to the element, enough to find it in the code. */
  where: string;
  text: string;
  detail: string;
}

export interface AuditOptions {
  minTap?: number;
  minFont?: number;
}

const INTERACTIVE = "button, a[href], [role=button], [role=tab], [role=switch], [role=radio], summary, select, input:not([type=hidden]), textarea";

function describe(el: Element): string {
  const part = (e: Element) => {
    const id = e.id ? `#${e.id}` : "";
    const cls = typeof e.className === "string" ? e.className.split(/\s+/).filter(Boolean).slice(0, 3).map((c) => `.${c}`).join("") : "";
    return `${e.tagName.toLowerCase()}${id}${cls}`.slice(0, 60);
  };
  const chain: string[] = [];
  let cur: Element | null = el;
  for (let i = 0; i < 3 && cur && cur !== document.documentElement; i++, cur = cur.parentElement) chain.unshift(part(cur));
  return chain.join(" > ");
}

function visible(el: Element): boolean {
  const cs = getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  // Parked wholly left of the screen on purpose, such as a menu drawer that slides in from the side: nobody
  // sees it. (Wholly past the right edge is not exempt: a page cannot be scrolled left, so that is a lost control.)
  if (r.right <= 0) return false;
  // Not for a person to use right now (a carousel card out of view), so not for the layout check either.
  if (el.closest("[inert]")) return false;
  // A screen-reader-only helper, or something parked off screen on purpose.
  if (/\bsr-only\b/.test(typeof el.className === "string" ? el.className : "")) return false;
  return true;
}

/** Where a piece of text actually is on screen. */
function textRects(el: Element): DOMRect[] {
  const out: DOMRect[] = [];
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const r of Array.from(range.getClientRects())) if (r.width > 0 && r.height > 0) out.push(r);
  }
  return out;
}

function scrollsHorizontally(el: Element): boolean {
  const cs = getComputedStyle(el);
  return /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth;
}

/**
 * The ancestor that cuts `el` off for good, if there is one. `overflow: hidden` (or clip) does that. An ancestor that
 * scrolls (auto, scroll) does not: what is outside its box is out of sight, but a thumb can bring it in, and nothing
 * further out can cut it off before that: a sheet's content is longer than the sheet, and that is the point.
 */
function clippedBy(el: Element, rect: DOMRect): { by: Element; axis: "x" | "y"; amount: number } | null {
  let reachableX = false;
  let reachableY = false;
  // The element itself counts: text inside an overflow:hidden box is cut off by that box.
  for (let a: Element | null = el; a && a !== document.documentElement; a = a.parentElement) {
    const cs = getComputedStyle(a);
    const box = a.getBoundingClientRect();
    const left = box.left + a.clientLeft;
    const top = box.top + a.clientTop;
    const right = left + a.clientWidth;
    const bottom = top + a.clientHeight;
    const overX = Math.max(left - rect.left, rect.right - right);
    const overY = Math.max(top - rect.top, rect.bottom - bottom);
    if (/(auto|scroll)/.test(cs.overflowX) && overX > 0.5) reachableX = true;
    if (/(auto|scroll)/.test(cs.overflowY) && overY > 0.5) reachableY = true;
    if (!reachableX && /(hidden|clip)/.test(cs.overflowX) && overX > 0.5) return { by: a, axis: "x", amount: overX };
    if (!reachableY && /(hidden|clip)/.test(cs.overflowY) && overY > 0.5) return { by: a, axis: "y", amount: overY };
  }
  return null;
}

function hitSize(el: Element): { w: number; h: number } {
  let target: Element = el;
  // A checkbox is hit through its label.
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) target = el.closest("label") ?? el;
  const r = target.getBoundingClientRect();
  let w = r.width;
  let h = r.height;
  // The invisible box `.hit-area` adds around a small control (index.css).
  const after = getComputedStyle(target, "::after");
  if (after.content !== "none" && after.position === "absolute") {
    w = Math.max(w, parseFloat(after.width) || 0);
    h = Math.max(h, parseFloat(after.height) || 0);
  }
  return { w, h };
}

export function audit(options: AuditOptions = {}): Finding[] {
  const minTap = options.minTap ?? 44;
  const minFont = options.minFont ?? 12;
  const findings: Finding[] = [];
  const seen = new Set<string>();
  const add = (f: Finding) => {
    const key = `${f.kind}|${f.where}|${f.detail}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push(f);
  };

  const viewport = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > viewport + 1) {
    add({ kind: "page-scrolls-sideways", severity: "error", where: "html", text: "", detail: `the page is ${document.documentElement.scrollWidth}px wide in a ${viewport}px screen` });
  }

  for (const el of Array.from(document.body.querySelectorAll("*"))) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    const sample = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);

    // ── Text ───────────────────────────────────────────────────────────────
    const rects = textRects(el);
    if (rects.length > 0) {
      const fontSize = parseFloat(cs.fontSize);
      if (fontSize < minFont) {
        add({ kind: "small-text", severity: "info", where: describe(el), text: sample, detail: `${fontSize}px` });
      }
      const union = rects.reduce(
        (u, r) => new DOMRect(Math.min(u.left, r.left), Math.min(u.top, r.top), Math.max(u.right, r.right) - Math.min(u.left, r.left), Math.max(u.bottom, r.bottom) - Math.min(u.top, r.top)),
        rects[0],
      );
      const clip = clippedBy(el, union);
      // Shortened on purpose: one line with "…" (text-overflow) or a few lines with "…" (line-clamp).
      const clamped = !!clip && /^[1-9]/.test((getComputedStyle(clip.by) as CSSStyleDeclaration & { webkitLineClamp?: string }).webkitLineClamp ?? "");
      const ellipsis = cs.textOverflow === "ellipsis" || clamped;
      if (clip && !ellipsis) {
        add({ kind: "clipped-text", severity: "error", where: describe(el), text: sample, detail: `cut off by ${describe(clip.by)} (${clip.axis === "x" ? "sideways" : "top or bottom"}, ${clip.amount.toFixed(1)}px)` });
      } else if (clamped) {
        add({ kind: "truncated", severity: "info", where: describe(el), text: sample, detail: "shortened to a few lines with \"…\"" });
      } else if (ellipsis && el.scrollWidth > el.clientWidth + 1) {
        add({ kind: "truncated", severity: "info", where: describe(el), text: sample, detail: `shortened with "…" (${el.scrollWidth}px of text in ${el.clientWidth}px)` });
      }
      // Past the edge of the screen with nothing to scroll it into view.
      let scrolled = false;
      for (let a: Element | null = el; a; a = a.parentElement) if (scrollsHorizontally(a)) scrolled = true;
      // (Text an ancestor cuts off or shortens with "…" is reported above, not as running off the screen.)
      if (!scrolled && !clip && !ellipsis && cs.position !== "fixed" && (union.right > viewport + 0.5 || union.left < -0.5)) {
        add({ kind: "offscreen", severity: "error", where: describe(el), text: sample, detail: `text from ${union.left.toFixed(0)} to ${union.right.toFixed(0)}px in a ${viewport}px screen` });
      }
    }

    // ── Controls ──────────────────────────────────────────────────────────
    if (el.matches(INTERACTIVE) && !el.closest("[aria-hidden=true]")) {
      // A link inside a sentence is as big as its words; that is how links work.
      if (el instanceof HTMLAnchorElement && cs.display === "inline") continue;
      if (el instanceof HTMLInputElement && el.type === "file") continue;
      const { w, h } = hitSize(el);
      if (w < minTap || h < minTap) {
        // Under 40 px is a real miss; 40 to 44 (a menu row, say) is close enough to mention but not to insist on.
        add({ kind: "small-tap-target", severity: Math.min(w, h) < 40 ? "warn" : "info", where: describe(el), text: sample || (el.getAttribute("aria-label") ?? ""), detail: `${Math.round(w)}×${Math.round(h)}px (at least ${minTap}×${minTap} is easy to hit)` });
      }
    }

    // ── Pictures ──────────────────────────────────────────────────────────
    if (el instanceof HTMLImageElement && el.complete && el.naturalWidth === 0) {
      add({ kind: "broken-image", severity: "error", where: describe(el), text: el.alt, detail: `did not load: ${el.currentSrc.slice(0, 60)}` });
    }
  }

  // A control, an icon or a picture that a parent's overflow:hidden shaves a little off: a ring, a counter badge in
  // a corner, a focus outline. (A box cut by more than most of itself is a crop on purpose, not a slip.)
  for (const el of Array.from(document.body.querySelectorAll(`${INTERACTIVE}, svg, img`))) {
    if (!visible(el) || el.closest("svg") !== (el instanceof SVGElement ? el : null) && el.closest("svg")) continue;
    // A map's tiles run past their box by design.
    if (el.closest(".leaflet-container")) continue;
    const r = el.getBoundingClientRect();
    const clip = clippedBy(el, r);
    if (!clip || clip.by === el) continue;
    if (clip.amount > Math.min(r.width, r.height) * 0.6) continue;
    add({ kind: "clipped-box", severity: "warn", where: describe(el), text: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30), detail: `${clip.amount.toFixed(1)}px cut off by ${describe(clip.by)} (${clip.axis === "x" ? "sideways" : "top or bottom"})` });
  }

  // The part of a box that sticks out past the screen, for what has no text of its own.
  for (const el of Array.from(document.body.querySelectorAll("*"))) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.position === "fixed" || cs.position === "sticky") continue;
    const r = el.getBoundingClientRect();
    if (r.right <= viewport + 1 && r.left >= -1) continue;
    let scrolled = false;
    for (let a: Element | null = el.parentElement; a; a = a.parentElement) if (scrollsHorizontally(a) || /(hidden|clip)/.test(getComputedStyle(a).overflowX)) scrolled = true;
    if (!scrolled) add({ kind: "offscreen", severity: "warn", where: describe(el), text: "", detail: `box from ${r.left.toFixed(0)} to ${r.right.toFixed(0)}px in a ${viewport}px screen` });
  }
  return findings;
}

declare global {
  interface Window {
    __audit?: typeof audit;
  }
}
window.__audit = audit;

// ── Button heights ───────────────────────────────────────────────────────────────────────────────────────────────
// `window.__buttons()` lists every visible element that is a button (the `.btn-*` family, `<Button>`, `HeroButton`,
// and a hand-made `button` or `a` that looks like one) with its rendered height, so `mobile-audit --buttons` can
// check that they follow the one scale (docs/design-system.md#buttons): standard 44 px on a phone and 40 px from
// the `lg` breakpoint up, compact (`.btn-compact`) 40 and 36.

export interface ButtonRecord {
  /** `primary`, `secondary`, `tonal`, `ghost`, `danger`, `danger-soft`, or `hand-made` (no `.btn-*` class). */
  tier: string;
  /** `compact` when it carries `.btn-compact`, otherwise `standard`. */
  size: "standard" | "compact";
  height: number;
  width: number;
  where: string;
  text: string;
  /** The classes, to find out why a button is not the height it should be. */
  classes: string;
}

const BUTTON_TIERS = ["primary", "secondary", "tonal", "ghost", "danger-soft", "danger"] as const;
/** Not part of the scale: icon buttons, filter chips, segmented items, tabs, switches, menu rows and the like. */
const NOT_A_BUTTON = ".icon-btn, .chip, .segmented-item, .tag, [role=tab], [role=switch], [role=radio], [role=menuitem], [role=option], [role=checkbox], nav, [data-not-a-button]";

export function buttons(): ButtonRecord[] {
  const out: ButtonRecord[] = [];
  for (const el of Array.from(document.body.querySelectorAll("button, a[href], [role=button]"))) {
    if (!visible(el) || el.closest("[aria-hidden=true]")) continue;
    const classes = typeof el.className === "string" ? el.className : "";
    const tier = BUTTON_TIERS.find((t) => el.classList.contains(`btn-${t}`));
    if (!tier && (el.matches(NOT_A_BUTTON) || el.closest(NOT_A_BUTTON))) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 30);
    if (!tier) {
      // A hand-made one: a box with a fill or an outline, rounded, of button size, with a label.
      if (!text || cs.display === "inline" || r.height < 26 || r.height > 56 || r.width > 420) continue;
      const filled = cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent";
      const outlined = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none";
      if (!filled && !outlined) continue;
      if (parseFloat(cs.borderTopLeftRadius) < 6 || parseFloat(cs.borderTopLeftRadius) > 20) continue;
    }
    out.push({ tier: tier ?? "hand-made", size: el.classList.contains("btn-compact") ? "compact" : "standard", height: Math.round(r.height * 10) / 10, width: Math.round(r.width), where: describe(el), text, classes: classes.slice(0, 160) });
  }
  return out;
}

declare global {
  interface Window {
    __buttons?: typeof buttons;
  }
}
window.__buttons = buttons;
