import { Pencil, Trash2 } from "lucide-react";

interface Props {
  id: string;
  confirmId: string | null;
  isPending: boolean;
  onEdit: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

export function DeleteConfirmActions({
  id,
  confirmId,
  isPending,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: Props) {
  if (confirmId === id) {
    return (
      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
        <span className="hidden text-xs text-ink-3 sm:inline">Verwijderen?</span>
        <button
          onClick={onConfirmDelete}
          disabled={isPending}
          className="rounded-lg bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-200 disabled:opacity-50 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25 sm:px-2.5 sm:py-1.5"
        >
          {isPending ? "..." : "Ja"}
        </button>
        <button
          onClick={onCancelDelete}
          className="rounded-lg bg-sunken px-2 py-1 text-xs font-semibold text-ink-2 transition-colors hover:text-ink sm:px-2.5 sm:py-1.5"
        >
          Nee
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-0.5 sm:gap-1">
      <button
        onClick={onEdit}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink sm:h-8 sm:w-8"
        title="Bewerken"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={onRequestDelete}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-500/15 dark:hover:text-rose-300 sm:h-8 sm:w-8"
        title="Verwijderen"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
