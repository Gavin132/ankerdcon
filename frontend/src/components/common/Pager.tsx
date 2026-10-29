import { ChevronLeft, ChevronRight } from "lucide-react";

interface PagerProps {
  count: number;
  /** The page in view, 0-based. */
  index: number;
  onChange: (index: number) => void;
  /** Name of one dot for a screen reader ("Ga naar evenement 2"). */
  dotLabel: (index: number) => string;
  prevLabel: string;
  nextLabel: string;
  /** Show the arrows from this width up only: on a phone you swipe, so the dots are enough. */
  arrowsFrom?: "always" | "md";
  className?: string;
}

/**
 * The dots and arrows under a row of cards you page through (the Hub's trips, the Agenda's tickets).
 * Dots are 44 px to hit, the active one is a bar; arrows are the same `icon-btn` everywhere.
 */
export function Pager({ count, index, onChange, dotLabel, prevLabel, nextLabel, arrowsFrom = "always", className = "" }: PagerProps) {
  const arrowClass = `icon-btn border-1.5 border-line bg-surface ${arrowsFrom === "md" ? "max-md:hidden" : ""}`;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex flex-1 flex-wrap items-center ${arrowsFrom === "md" ? "justify-center md:justify-start" : ""}`}>
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            aria-label={dotLabel(i)}
            aria-current={i === index}
            className="hit-area flex h-11 min-w-[28px] items-center justify-center"
          >
            <span
              className={`block h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-ink" : "w-1.5 bg-ink-3/50 hover:bg-ink-3"
              }`}
            />
          </button>
        ))}
      </div>
      <button type="button" onClick={() => onChange(index - 1)} aria-label={prevLabel} disabled={index === 0} className={arrowClass}>
        <ChevronLeft size={16} />
      </button>
      <button type="button" onClick={() => onChange(index + 1)} aria-label={nextLabel} disabled={index === count - 1} className={arrowClass}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
