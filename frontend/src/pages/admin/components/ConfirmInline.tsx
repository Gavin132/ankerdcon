interface Props {
  /** The question, e.g. "Verwijderen?" or "Dag verwijderen?". */
  question?: string;
  /** The confirm button: what happens ("Verwijderen", "Deactiveren"). */
  confirmLabel?: string;
  isPending?: boolean;
  /** Not a delete (deactivate): the confirm button is not red. */
  calm?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The two-step "are you sure" for removing one row from a list or table: the question, "Annuleren" and the
 * red confirm button, all 44 px tall. Use `askConfirm` instead when a delete takes other things with it.
 * Inside a `.stack-table` the `data-confirm` marker lets the question take a line of its own on a phone.
 */
export function ConfirmInline({
  question = "Verwijderen?",
  confirmLabel = "Verwijderen",
  isPending,
  calm,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div data-confirm className="flex flex-wrap items-center justify-end gap-2">
      <span className="mr-auto text-sm font-medium text-ink">{question}</span>
      <button type="button" onClick={onCancel} disabled={isPending} className="btn-secondary px-3 text-sm">
        Annuleren
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={isPending}
        className={`${calm ? "btn-secondary" : "btn-danger"} px-3 text-sm`}
      >
        {isPending ? "Bezig…" : confirmLabel}
      </button>
    </div>
  );
}
