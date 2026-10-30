import type { ReactNode } from "react";

/**
 * A fact under a trip's title (where, hotel, activity) as a flat chip, so it reads as its own thing and not as the
 * first line of the description. A link gets the bordered `chip-off` look instead (see TripTicket).
 */
export function InfoChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="chip max-w-full border-transparent bg-sunken text-ink-2">
      <span className="shrink-0">{icon}</span> <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}
