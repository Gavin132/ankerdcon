import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";

interface TripTileProps {
  icon: LucideIcon;
  label: string;
  /** Opens this page. Tiles for things you change (rides, meals, rooms…) link out. */
  to?: string;
  /** Unfolds read-only info in place instead of linking out. */
  onToggle?: () => void;
  expanded?: boolean;
  /** Opens something in place (e.g. a photo viewer) instead of navigating — same "Naar X" affordance as `to`, but a callback. */
  onOpen?: () => void;
  /** A status pill next to the label, e.g. how many people still miss a ride. */
  pill?: ReactNode;
  /** Two columns wide; `full` takes the whole row. */
  size?: "small" | "wide" | "full";
  children: ReactNode;
}

const SPAN = { small: "", wide: "col-span-2", full: "col-span-2 lg:col-span-4" };

/**
 * One tile on Event › Overzicht. The tile answers the question (6 rides, 3
 * people without a ride back); editing happens on the page it links to.
 */
export function TripTile({ icon: Icon, label, to, onToggle, expanded, onOpen, pill, size = "small", children }: TripTileProps) {
  const className = `card-surface group flex min-h-[132px] min-w-0 flex-col gap-2 p-4 text-left transition-colors ${SPAN[size]} ${
    to || onToggle || onOpen ? "hover:border-ink-3" : ""
  }`;

  const header = (
    <span className="flex w-full items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
        <Icon size={15} />
      </span>
      <span className="section-label min-w-0 flex-1 truncate text-ink-2">{label}</span>
      {pill}
      {(to || onOpen) && <ChevronRight size={15} className="shrink-0 text-ink-3 transition-colors group-hover:text-ink" />}
    </span>
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {header}
        {children}
        <span className="mt-auto flex items-center gap-1 pt-1 text-[12.5px] font-semibold text-brand-text">
          Naar {label.toLowerCase()} <ArrowRight size={13} />
        </span>
      </Link>
    );
  }

  if (onToggle) {
    return (
      <button type="button" onClick={onToggle} aria-expanded={expanded} className={className}>
        {header}
        {children}
        <span className="mt-auto flex items-center gap-1 pt-1 text-[12.5px] font-semibold text-brand-text">
          {expanded ? "Inklappen" : "Uitklappen"} <ChevronDown size={13} className={expanded ? "rotate-180" : ""} />
        </span>
      </button>
    );
  }

  if (onOpen) {
    return (
      <button type="button" onClick={onOpen} className={className}>
        {header}
        {children}
        <span className="mt-auto flex items-center gap-1 pt-1 text-[12.5px] font-semibold text-brand-text">
          Bekijken <ArrowRight size={13} />
        </span>
      </button>
    );
  }

  return <div className={className}>{header}{children}</div>;
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
    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11.5px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
      {children}
    </span>
  );
}
