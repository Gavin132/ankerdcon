import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

interface InfoChipProps {
  icon: ReactNode;
  children: ReactNode;
  /** Makes it a link that opens in a new tab (a map, the event's website). */
  href?: string;
  title?: string;
  ariaLabel?: string;
  /** Shows the "opens elsewhere" arrow, for a link that leaves the app. */
  external?: boolean;
}

const BASE = "chip max-w-full border-transparent bg-sunken text-ink-2";

/**
 * A fact under a trip's title (where, hotel, website, activity) as a flat chip, so it reads as its own thing and not as
 * the first line of the description. The same chip on the event page, the Hub and the Agenda; with `href` it is a link.
 */
export function InfoChip({ icon, children, href, title, ariaLabel, external }: InfoChipProps) {
  const body = (
    <>
      <span className="shrink-0">{icon}</span> <span className="min-w-0 truncate">{children}</span>
      {external && <ExternalLink size={12} className="shrink-0" aria-hidden />}
    </>
  );
  if (!href) return <span className={BASE}>{body}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      aria-label={ariaLabel}
      className={`${BASE} hover:border-ink-3 hover:text-ink`}
    >
      {body}
    </a>
  );
}
