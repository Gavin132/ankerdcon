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
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-slate-500">Verwijderen?</span>
        <button
          onClick={onConfirmDelete}
          disabled={isPending}
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 disabled:opacity-50 transition-colors"
        >
          {isPending ? "..." : "Ja"}
        </button>
        <button
          onClick={onCancelDelete}
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white/[0.06] text-slate-400 hover:bg-white/[0.1] transition-colors"
        >
          Nee
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={onEdit}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-slate-300 transition-colors"
        title="Bewerken"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={onRequestDelete}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
        title="Verwijderen"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
