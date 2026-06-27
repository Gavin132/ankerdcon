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
   * Pass a separator `<div className="h-4 w-px bg-white/[0.12]" />` between groups if needed.
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
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 pointer-events-none">
      <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-2xl border border-white/[0.12] bg-slate-900/95 backdrop-blur-sm shadow-2xl px-3 py-2">
        {/* Count badge */}
        <span className="px-2 text-sm font-semibold text-slate-300 select-none whitespace-nowrap">
          {count} geselecteerd
        </span>
        <div className="h-4 w-px bg-white/[0.12] mx-1" />

        {/* Content */}
        {overrideContent ? (
          overrideContent
        ) : confirmDelete ? (
          <>
            <span className="px-2 text-sm text-rose-400 whitespace-nowrap">Zeker weten?</span>
            <button
              onClick={onDelete}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-40"
            >
              {isPending ? "Bezig…" : "Ja, verwijder"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={isPending}
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-slate-400 hover:bg-white/[0.08] transition-colors"
            >
              Annuleer
            </button>
          </>
        ) : (
          <>
            {extraActions}
            {extraActions && <div className="h-4 w-px bg-white/[0.12] mx-1" />}
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors disabled:opacity-40"
            >
              <Trash2 size={14} />
              Verwijder
            </button>
          </>
        )}

        {/* Clear */}
        <div className="h-4 w-px bg-white/[0.12] mx-1" />
        <button
          onClick={() => { setConfirmDelete(false); onClear(); }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.08] hover:text-slate-300 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
