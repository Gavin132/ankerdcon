import { Trash2, X } from "lucide-react";
import { askConfirm } from "../../../store/confirm.store";

interface AdminBulkBarProps {
  /** Number of selected rows. Bar is hidden when 0. */
  count: number;
  isPending: boolean;
  onDelete: () => void;
  onClear: () => void;
  /** What the rows are, for the question ("3 gebruikers verwijderen?"). */
  itemsLabel?: string;
  /** Extra action buttons shown in idle mode (before the delete button). */
  extraActions?: React.ReactNode;
  /**
   * When provided, replaces the entire idle content (including delete).
   * Useful for pages that need a custom secondary mode (e.g. "set group" panel).
   */
  overrideContent?: React.ReactNode;
}

/**
 * What can be done with the selected rows. It sits in the page, in the flow, right above the table (nothing
 * floats over the rows), and only shows while something is selected. Deleting asks first.
 */
export function AdminBulkBar({
  count,
  isPending,
  onDelete,
  onClear,
  itemsLabel = "items",
  extraActions,
  overrideContent,
}: AdminBulkBarProps) {
  if (count === 0) return null;

  async function requestDelete() {
    const ok = await askConfirm({
      title: count === 1 ? "Selectie verwijderen?" : `${count} ${itemsLabel} verwijderen?`,
      message: "Dit kan niet ongedaan worden gemaakt.",
      confirmLabel: "Verwijderen",
      cancelLabel: "Annuleren",
      destructive: true,
    });
    if (ok) onDelete();
  }

  return (
    <div className="card-surface !bg-sunken px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-auto select-none whitespace-nowrap text-sm font-semibold tabular-nums text-ink">
          {count} geselecteerd
        </span>

        {/* On a phone the actions get a line of their own under the count and share its width; from sm they sit
            in the same line. */}
        <div className="order-last flex w-full flex-wrap items-center gap-2 max-sm:[&>*]:flex-1 sm:order-none sm:w-auto">
          {overrideContent ? (
            overrideContent
          ) : (
            <>
              {extraActions}
              <button type="button" onClick={requestDelete} disabled={isPending} className="btn-danger-soft px-3 text-sm">
                <Trash2 size={16} />
                {isPending ? "Bezig…" : "Verwijderen"}
              </button>
            </>
          )}
        </div>

        <button type="button" onClick={onClear} aria-label="Selectie wissen" className="icon-btn">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
