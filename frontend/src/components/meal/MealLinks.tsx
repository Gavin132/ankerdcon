import { Globe, BookOpen, ExternalLink } from "lucide-react";

interface MealLinksProps {
  website?: string;
  menuUrl?: string;
}

export function MealLinks({ website, menuUrl }: MealLinksProps) {
  if (!website && !menuUrl) return null;

  return (
    <div className="card-surface rounded-2xl overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-violet-400 to-purple-500" />
      <div className="px-4 py-4">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Links</h2>
        <div className="flex flex-wrap gap-2.5">
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                         bg-slate-50 dark:bg-black/20 px-4 py-2.5 text-sm font-semibold
                         text-slate-700 dark:text-slate-200
                         hover:border-violet-300 dark:hover:border-violet-500/50
                         hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors group"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40 group-hover:bg-violet-200 dark:group-hover:bg-violet-800/40 transition-colors">
                <Globe size={14} className="text-violet-600 dark:text-violet-400" />
              </div>
              <span>Website</span>
              <ExternalLink size={11} className="text-slate-400 ml-auto" />
            </a>
          )}
          {menuUrl && (
            <a
              href={menuUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                         bg-slate-50 dark:bg-black/20 px-4 py-2.5 text-sm font-semibold
                         text-slate-700 dark:text-slate-200
                         hover:border-amber-300 dark:hover:border-amber-500/50
                         hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors group"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/40 transition-colors">
                <BookOpen size={14} className="text-amber-600 dark:text-amber-400" />
              </div>
              <span>Menu bekijken</span>
              <ExternalLink size={11} className="text-slate-400 ml-auto" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
