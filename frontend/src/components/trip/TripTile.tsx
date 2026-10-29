import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";

interface TripTileProps {
  icon: LucideIcon;
  label: string;
  /** Opens this page. Tiles for things you change (rides, meals, rooms…) link out. */
  to?: string;
  /** `to` opens a bottom sheet over this page, so the chevron already says enough — no "Naar …" footer. */
  sheet?: boolean;
  /** Unfolds read-only info in place instead of linking out. */
  onToggle?: () => void;
  expanded?: boolean;
  /** Opens something in place (e.g. a photo viewer) instead of navigating — the chevron is the affordance, no footer line. */
  onOpen?: () => void;
  /** A status pill next to the label, e.g. how many people still miss a ride. */
  pill?: ReactNode;
  /** A small button at the end of the header, e.g. the "+" that adds something to this tile. */
  action?: ReactNode;
  /** Two columns wide; `full` takes the whole row. */
  size?: "small" | "wide" | "full";
  children: ReactNode;
}

const SPAN = { small: "", wide: "col-span-2", full: "col-span-2 lg:col-span-4" };

const LABEL = "section-label min-w-0 flex-1 truncate text-ink-2";
/** Makes the label's own link or button cover the whole tile, so the tile is one tap target without being an
 * interactive element that holds other interactive ones. Whatever has to stay tappable on top of it (the pill,
 * the "+", a photo) is `relative` and comes later in the DOM. */
const STRETCH = "after:absolute after:inset-0 after:content-['']";

/**
 * One tile on Event › Overzicht. The tile answers the question (6 rides, 3
 * people without a ride back); editing happens on the page it links to.
 */
export function TripTile({ icon: Icon, label, to, onToggle, expanded, onOpen, sheet, pill, action, size = "small", children }: TripTileProps) {
  const className = `card-surface group flex min-h-[132px] min-w-0 flex-col gap-2 p-4 text-left transition-colors ${SPAN[size]} ${
    to || onToggle || onOpen ? "hover:border-ink-3" : ""
  }`;

  const header = (labelEl: ReactNode) => (
    <span className="flex w-full items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
        <Icon size={16} />
      </span>
      {labelEl}
      {(pill || action) && <span className="relative flex shrink-0 items-center gap-2">{pill}{action}</span>}
      {(to || onOpen) && <ChevronRight size={16} className="shrink-0 text-ink-3 transition-colors group-hover:text-ink" />}
    </span>
  );

  if (to) {
    return (
      <div className={`relative ${className}`}>
        {header(<Link to={to} className={`${LABEL} ${STRETCH}`}>{label}</Link>)}
        {children}
        {!sheet && (
          <span aria-hidden className="mt-auto flex items-center gap-1 pt-1 text-[12.5px] font-semibold text-brand-text">
            Naar {label.toLowerCase()} <ArrowRight size={14} />
          </span>
        )}
      </div>
    );
  }

  if (onToggle) {
    return (
      <button type="button" onClick={onToggle} aria-expanded={expanded} className={className}>
        {header(<span className={LABEL}>{label}</span>)}
        {children}
        <span className="mt-auto flex items-center gap-1 pt-1 text-[12.5px] font-semibold text-brand-text">
          {expanded ? "Inklappen" : "Uitklappen"} <ChevronDown size={14} className={expanded ? "rotate-180" : ""} />
        </span>
      </button>
    );
  }

  if (onOpen) {
    // Some tiles (Foto's) put their own buttons in `children`, and a <button> cannot hold another one. So the
    // label is the button and stretches over the tile.
    return (
      <div className={`relative ${className}`}>
        {header(<button type="button" onClick={onOpen} className={`${LABEL} text-left ${STRETCH}`}>{label}</button>)}
        {children}
      </div>
    );
  }

  return <div className={className}>{header(<span className={LABEL}>{label}</span>)}{children}</div>;
}

/** The big one-line answer on a tile. */
export function TileValue({ children }: { children: ReactNode }) {
  return <p className="font-display text-[28px] font-extrabold uppercase leading-[0.95] text-ink [text-wrap:balance]">{children}</p>;
}

/** Supporting text under the value. */
export function TileText({ children }: { children: ReactNode }) {
  return <p className="text-[12.5px] leading-snug text-ink-2">{children}</p>;
}

/** Amber pill for something that still needs attention. */
export function TilePill({ children }: { children: ReactNode }) {
  return (
    <span className="pill pill-warn shrink-0">
      {children}
    </span>
  );
}
