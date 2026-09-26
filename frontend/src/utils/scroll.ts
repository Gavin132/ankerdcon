/** The nearest ancestor that actually scrolls vertically, else the page. */
function scrollParent(el: HTMLElement): HTMLElement {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if ((overflowY === "auto" || overflowY === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return (document.scrollingElement as HTMLElement) ?? document.documentElement;
}

/**
 * Scrolls just far enough to bring `el` fully into view, with our own easing
 * instead of the browser's `behavior: "smooth"` — that one is skipped by some
 * OS animation settings and gets cancelled when the layout shifts underneath
 * it, which is exactly what happens when a panel has just opened. Recomputes
 * the distance every frame, so it also follows content that loads in late.
 */
export function smoothScrollIntoView(el: HTMLElement, { margin = 16, maxMs = 900 }: { margin?: number; maxMs?: number } = {}): void {
  const parent = scrollParent(el);
  const isPage = parent === document.scrollingElement || parent === document.documentElement || parent === document.body;
  const start = performance.now();

  const step = (now: number) => {
    const rect = el.getBoundingClientRect();
    const view = isPage ? { top: 0, bottom: window.innerHeight } : parent.getBoundingClientRect();
    let delta = 0;
    if (rect.bottom + margin > view.bottom) delta = Math.min(rect.bottom + margin - view.bottom, rect.top - view.top - margin);
    else if (rect.top - margin < view.top) delta = rect.top - margin - view.top;

    if (Math.abs(delta) < 1 || now - start > maxMs) return;
    // Ease out: cover a fixed share of what's left each frame, at least a pixel.
    const move = Math.sign(delta) * Math.max(1, Math.abs(delta) * 0.16);
    if (isPage) window.scrollBy(0, move);
    else parent.scrollTop += move;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
