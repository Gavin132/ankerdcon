import { BTN_PRIMARY, BTN_SECONDARY } from "../styles";

interface Props {
  onCancel: () => void;
  formId: string;
  isPending: boolean;
  isEdit: boolean;
  /** The main button when it is not the usual "Opslaan" / "Toevoegen" ("Plaatsen" for a post that goes live). */
  submitLabel?: string;
  /** The form cannot be saved yet (a required field is empty). */
  disabled?: boolean;
}

/** Footer of an admin sheet: "Annuleren" and the blue button that submits the form with `formId`. */
export function DrawerFooter({ onCancel, formId, isPending, isEdit, submitLabel, disabled }: Props) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onCancel}
        className={`flex-1 ${BTN_SECONDARY}`}
      >
        Annuleren
      </button>
      <button
        type="submit"
        form={formId}
        disabled={isPending || disabled}
        className={`flex-1 ${BTN_PRIMARY}`}
      >
        {isPending ? "Opslaan…" : (submitLabel ?? (isEdit ? "Opslaan" : "Toevoegen"))}
      </button>
    </div>
  );
}
