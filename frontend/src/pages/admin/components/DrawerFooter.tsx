import { BTN_PRIMARY, BTN_SECONDARY } from "../styles";

interface Props {
  onCancel: () => void;
  formId: string;
  isPending: boolean;
  isEdit: boolean;
}

export function DrawerFooter({ onCancel, formId, isPending, isEdit }: Props) {
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
        disabled={isPending}
        className={`flex-1 ${BTN_PRIMARY}`}
      >
        {isPending ? "Opslaan..." : isEdit ? "Bijwerken" : "Aanmaken"}
      </button>
    </div>
  );
}
