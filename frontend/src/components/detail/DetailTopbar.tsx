import { ArrowLeft, Share2 } from "lucide-react";
import { HomeLinkButton } from "../common/HomeLinkButton";
import { isFreshEntry } from "../../hooks/useSmartBack";

interface DetailTopbarProps {
  title: string;
  onBack: () => void;
  onShare?: () => void;
  /** Extra icon buttons rendered between share and the home-link button —
   * e.g. the event page's story add/view actions. Compose with the same
   * h-8 w-8 rounded-xl icon-button styling used by the buttons here. */
  actions?: React.ReactNode;
}

export function DetailTopbar({ title, onBack, onShare, actions }: DetailTopbarProps) {
  return (
    <div
      className="sticky top-0 z-10 flex items-center gap-3 h-14 px-4
                 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md
                 border-b border-slate-200 dark:border-white/[0.06]"
    >
      <button
        onClick={onBack}
        className="flex h-8 w-8 items-center justify-center rounded-xl
                   text-slate-500 dark:text-slate-400
                   hover:bg-slate-100 dark:hover:bg-white/[0.08]
                   hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
      </button>
      <span className="font-bold text-slate-900 dark:text-white text-sm truncate flex-1 min-w-0">
        {title}
      </span>
      {onShare && (
        <button
          onClick={onShare}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl
                     text-slate-500 dark:text-slate-400
                     hover:bg-slate-100 dark:hover:bg-white/[0.08]
                     hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <Share2 size={17} />
        </button>
      )}
      {actions}
      {isFreshEntry() && (
        <HomeLinkButton
          size={17}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl
                     text-slate-500 dark:text-slate-400
                     hover:bg-slate-100 dark:hover:bg-white/[0.08]
                     hover:text-slate-900 dark:hover:text-white transition-colors"
        />
      )}
    </div>
  );
}
