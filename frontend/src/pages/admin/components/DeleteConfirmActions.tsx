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
  /** Names the buttons for a screen reader: "Sam bewerken", "Sam verwijderen". */
  editLabel?: string;
  deleteLabel?: string;
  /** Another button before edit ("Evenement bekijken"). */
  before?: React.ReactNode;
}

/** The edit and delete buttons at the end of a table row; "delete" turns into the two-step question in place. */
export function DeleteConfirmActions({
  id,
  confirmId,
  isPending,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  editLabel = "Bewerken",
  deleteLabel = "Verwijderen",
  before,
}: Props) {
  if (confirmId === id) {
    return <ConfirmInline isPending={isPending} onConfirm={onConfirmDelete} onCancel={onCancelDelete} />;
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {before}
      <button onClick={onEdit} className="icon-btn text-ink-3" title="Bewerken" aria-label={editLabel}>
        <Pencil size={16} />
      </button>
      <button
        onClick={onRequestDelete}
        className="icon-btn text-ink-3 hover:!bg-bad-soft hover:!text-bad"
        title="Verwijderen"
        aria-label={deleteLabel}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
