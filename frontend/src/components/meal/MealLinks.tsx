import { Globe, BookOpen, ExternalLink } from "lucide-react";

interface MealLinksProps {
  website?: string;
  menuUrl?: string;
}

const LINK =
  "flex items-center gap-2.5 rounded-xl border-1.5 border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink-3";

export function MealLinks({ website, menuUrl }: MealLinksProps) {
  if (!website && !menuUrl) return null;

  return (
    <div className="card-surface overflow-hidden">
      <div className="px-4 py-4">
        <h2 className="section-label mb-3">Links</h2>
        <div className="flex flex-wrap gap-2.5">
          {website && (
            <a href={website} target="_blank" rel="noopener noreferrer" className={LINK}>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sunken text-ink">
                <Globe size={14} />
              </span>
              <span>Website</span>
              <ExternalLink size={11} className="ml-auto text-ink-3" />
            </a>
          )}
          {menuUrl && (
            <a href={menuUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sunken text-ink">
                <BookOpen size={14} />
              </span>
              <span>Menu bekijken</span>
              <ExternalLink size={11} className="ml-auto text-ink-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
