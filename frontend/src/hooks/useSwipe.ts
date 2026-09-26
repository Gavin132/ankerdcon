import { useEffect, useRef, type RefObject } from "react";

const MIN_DISTANCE = 70;   // px the finger must travel sideways
const MAX_DURATION = 800;  // ms; a slow drag is a scroll or a selection, not a swipe
const DIRECTION_RATIO = 1.8; // sideways travel must beat vertical travel by this much
const EDGE = 24;           // px; a swipe starting at the screen edge belongs to the browser's back gesture

/** True when a horizontal swipe starting here would be aimed at something else: a row that scrolls
 * sideways, a text field, a slider, or anything marked `data-no-swipe`. */
function swipeBelongsToTarget(target: EventTarget | null, container: HTMLElement): boolean {
  let el = target instanceof Element ? target : null;
  while (el && el !== container.parentElement) {
    if (el.matches("input, textarea, select, [contenteditable='true'], [data-no-swipe]")) return true;
    if (el instanceof HTMLElement && el.scrollWidth > el.clientWidth + 1) {
      const overflowX = getComputedStyle(el).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") return true;
    }
    el = el.parentElement;
  }
  return false;
}

/**
 * Calls `onLeft` when the user swipes their finger to the left across `ref`'s element, `onRight` for
 * the other way. Only touches that start inside the element count, so a sheet or popup portaled to
 * <body> on top of it is left alone, and so is anything that scrolls or edits sideways itself.
 */
export function useSwipe(
  ref: RefObject<HTMLElement>,
  { onLeft, onRight, enabled = true }: { onLeft?: () => void; onRight?: () => void; enabled?: boolean },
) {
  const handlers = useRef({ onLeft, onRight });
  handlers.current = { onLeft, onRight };

  useEffect(() => {
    const container = ref.current;
    if (!enabled || !container) return;

    let start: { x: number; y: number; t: number } | null = null;

    const onStart = (e: TouchEvent) => {
      start = null;
      if (e.touches.length !== 1) return;
      const { clientX: x, clientY: y } = e.touches[0];
      if (x < EDGE || x > window.innerWidth - EDGE) return;
      if (!container.contains(e.target as Node) || swipeBelongsToTarget(e.target, container)) return;
      start = { x, y, t: Date.now() };
    };

    const onEnd = (e: TouchEvent) => {
      if (!start) return;
      const from = start;
      start = null;
      const touch = e.changedTouches[0];
      if (!touch || Date.now() - from.t > MAX_DURATION) return;
      const dx = touch.clientX - from.x;
      const dy = touch.clientY - from.y;
      if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * DIRECTION_RATIO) return;
      if (dx < 0) handlers.current.onLeft?.();
      else handlers.current.onRight?.();
    };

    const onCancel = () => {
      start = null;
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
    };
  }, [ref, enabled]);
}
