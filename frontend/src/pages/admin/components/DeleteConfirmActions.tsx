import { Pencil, Trash2 } from "lucide-react";
import { ConfirmInline } from "./ConfirmInline";

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
    return <ConfirmInline isPending={isPending} onConfirm={onConfirmDelete} onCancel={onCancelDelete} />;
  }

  return (
    <div className="flex items-center justify-end gap-0.5 sm:gap-1">
      <button
        onClick={onEdit}
        className="hit-area flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
        title="Bewerken"
        aria-label="Bewerken"
      >
        <Pencil size={16} />
      </button>
      <button
        onClick={onRequestDelete}
        className="hit-area flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-bad-soft hover:text-bad"
        title="Verwijderen"
        aria-label="Verwijderen"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
