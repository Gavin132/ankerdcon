import { useState, useEffect } from "react";
import { Trash2, X } from "lucide-react";

interface AdminBulkBarProps {
  /** Number of selected rows. Bar is hidden when 0. */
  count: number;
  isPending: boolean;
  onDelete: () => void;
  onClear: () => void;
  /**
   * Extra action buttons shown in idle mode (before the delete button).
   * Pass a separator `<div className="h-4 w-px bg-line" />` between groups if needed.
   */
  extraActions?: React.ReactNode;
  /**
   * When provided, replaces the entire idle content (including delete).
   * Useful for pages that need a custom secondary mode (e.g. "set group" panel).
   */
  overrideContent?: React.ReactNode;
}

export function AdminBulkBar({
  count,
  isPending,
  onDelete,
  onClear,
  extraActions,
  overrideContent,
}: AdminBulkBarProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset confirm state whenever selection changes
  useEffect(() => {
    setConfirmDelete(false);
  }, [count]);

  if (count === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 sm:bottom-6">
      <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-xl border-2 border-outline bg-surface px-3 py-2 text-ink shadow-xl">
        {/* Count badge */}
        <span className="select-none whitespace-nowrap px-2 font-mono text-[12.5px] font-semibold tabular-nums text-ink">
          {count} geselecteerd
        </span>
        <div className="mx-1 h-4 w-px bg-line" />

        {/* Content */}
        {overrideContent ? (
          overrideContent
        ) : confirmDelete ? (
          <>
            <span className="whitespace-nowrap px-2 text-sm font-medium text-rose-700 dark:text-rose-300">Zeker weten?</span>
            <button
              onClick={onDelete}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg border-2 border-rose-800 bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-40 dark:border-rose-400"
            >
              {isPending ? "Bezig…" : "Ja, verwijder"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={isPending}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
            >
              Annuleer
            </button>
          </>
        ) : (
          <>
            {extraActions}
            {extraActions && <div className="mx-1 h-4 w-px bg-line" />}
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-40 dark:text-rose-300 dark:hover:bg-rose-500/15"
            >
              <Trash2 size={14} />
              Verwijder
            </button>
          </>
        )}

        {/* Clear */}
        <div className="mx-1 h-4 w-px bg-line" />
        <button
          onClick={() => { setConfirmDelete(false); onClear(); }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
