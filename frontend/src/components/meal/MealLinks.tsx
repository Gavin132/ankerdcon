import { Globe, BookOpen, ExternalLink } from "lucide-react";
import { safeHref } from "../../utils/validation";

interface MealLinksProps {
  website?: string;
  menuUrl?: string;
}

const LINK =
  "flex min-h-11 items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-brand-text transition-colors hover:bg-sunken";

/** The website and the menu: plain rows in one card, each opens in a new tab (hence the arrow icon). */
export function MealLinks(props: MealLinksProps) {
  const website = safeHref(props.website);
  const menuUrl = safeHref(props.menuUrl);
  if (!website && !menuUrl) return null;

  return (
    <div className="card-surface overflow-hidden">
      <h2 className="section-label px-4 pb-1 pt-4">Links</h2>
      <div className="divide-y divide-line">
        {website && (
          <a href={website} target="_blank" rel="noopener noreferrer" className={LINK}>
            <Globe size={16} className="shrink-0" />
            <span className="min-w-0 flex-1">Website</span>
            <ExternalLink size={14} className="shrink-0 text-ink-3" />
          </a>
        )}
        {menuUrl && (
          <a href={menuUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
            <BookOpen size={16} className="shrink-0" />
            <span className="min-w-0 flex-1">Menu bekijken</span>
            <ExternalLink size={14} className="shrink-0 text-ink-3" />
          </a>
        )}
      </div>
    </div>
  );
}
