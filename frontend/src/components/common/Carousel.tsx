import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Pager } from "./Pager";

interface CarouselProps<T> {
  items: T[];
  itemKey: (item: T) => string;
  renderItem: (item: T, index: number, active: boolean) => ReactNode;
  /** The item in view, when something else also decides it (the event page: the trip in the URL). The row scrolls there, smoothly,
   * whenever this changes and it is not already in view. Leave it out and the carousel keeps track by itself. */
  index?: number;
  /** Called once a swipe or a tap on the dots has settled on another item. */
  onIndexChange?: (index: number) => void;
  /** Dots and arrows under the row. */
  pager?: { dotLabel: (index: number) => string; prevLabel: string; nextLabel: string; arrowsFrom?: "always" | "md" };
  /** From `lg` up every slide is as tall as the tallest one (the Hub's cards), so paging does not move the dots below. Otherwise the row is
   * always as tall as the slide in view. */
  equalHeightFromLg?: boolean;
  gap?: "gap-3" | "gap-4";
}

/** How long the row has to be still before a swipe counts as having arrived. */
const SETTLE_MS = 140;

/**
 * The one carousel of the app: a row of slides that you swipe through sideways, each snapping into place (the Hub's trips, the
 * Agenda's tickets, the trips on the event page). It is the browser's own scrolling — the finger drags the row, the next slide comes
 * in beside the one leaving, and a tap on a dot or arrow glides there — so every place that pages through events moves the same way.
 *
 * On a phone the row is as tall as the slide in view, not the tallest one: otherwise a short slide sits above an empty gap. It is measured
 * again when the slide changes size (a list of names opening). Slides out of view are `inert`: cut off by the row's height, so they are not for
 * the keyboard or a screen reader either.
 */
export function Carousel<T>({ items, itemKey, renderItem, index, onIndexChange, pager, equalHeightFromLg = false, gap = "gap-3" }: CarouselProps<T>) {
  const rowRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [shown, setShown] = useState(index ?? 0);
  const emitted = useRef(index ?? 0);
  const settleTimer = useRef<number>();
  const handlers = useRef({ onIndexChange });
  handlers.current = { onIndexChange };

  /** The slide whose left edge is nearest to where the row is scrolled to. */
  const nearestIndex = useCallback(() => {
    const row = rowRef.current;
    if (!row) return 0;
    let best = 0;
    let bestDistance = Infinity;
    slideRefs.current.forEach((slide, i) => {
      if (!slide) return;
      const distance = Math.abs(slide.offsetLeft - row.scrollLeft);
      if (distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    });
    return best;
  }, []);

  const scrollToIndex = useCallback((i: number, smooth: boolean) => {
    const row = rowRef.current;
    const slide = slideRefs.current[i];
    if (!row || !slide) return;
    row.scrollTo({ left: slide.offsetLeft, behavior: smooth ? "smooth" : ("instant" as ScrollBehavior) });
  }, []);

  function onScroll() {
    const i = nearestIndex();
    setShown(i);
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      if (i === emitted.current) return;
      emitted.current = i;
      handlers.current.onIndexChange?.(i);
    }, SETTLE_MS);
  }
  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  // Start on the right slide without sliding there.
  useLayoutEffect(() => {
    if (index !== undefined && index > 0) scrollToIndex(index, false);
    // Only on mount: later changes of `index` glide, below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Something else moved to another item (the switcher, a link): glide there, unless the row is already on it.
  useEffect(() => {
    if (index === undefined || index === nearestIndex()) {
      if (index !== undefined) emitted.current = index;
      return;
    }
    emitted.current = index;
    scrollToIndex(index, true);
  }, [index, nearestIndex, scrollToIndex]);

  const [height, setHeight] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    const slide = slideRefs.current[shown];
    if (!slide) return;
    const measure = () => setHeight(Math.ceil(slide.getBoundingClientRect().height));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(slide);
    return () => observer.disconnect();
  }, [shown, items.length]);

  const selected = Math.min(shown, Math.max(0, items.length - 1));

  return (
    <div>
      <div
        ref={rowRef}
        onScroll={onScroll}
        style={{ "--row-h": height === undefined ? undefined : `${height}px` } as CSSProperties}
        className={`relative flex h-[var(--row-h)] items-start overflow-x-auto overflow-y-hidden snap-x snap-mandatory ${gap} scroll-smooth transition-[height] duration-200 ${
          equalHeightFromLg ? "lg:h-auto lg:items-stretch" : ""
        } [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        {items.map((item, i) => (
          <div
            key={itemKey(item)}
            ref={(el) => { slideRefs.current[i] = el; }}
            className="w-full shrink-0 snap-center"
            {...(i !== selected ? ({ inert: "" } as object) : {})}
          >
            {renderItem(item, i, i === selected)}
          </div>
        ))}
      </div>

      {pager && items.length > 1 && (
        <Pager
          className="mt-3"
          count={items.length}
          index={selected}
          onChange={(i) => scrollToIndex(Math.max(0, Math.min(items.length - 1, i)), true)}
          dotLabel={pager.dotLabel}
          prevLabel={pager.prevLabel}
          nextLabel={pager.nextLabel}
          arrowsFrom={pager.arrowsFrom}
        />
      )}
    </div>
  );
}
