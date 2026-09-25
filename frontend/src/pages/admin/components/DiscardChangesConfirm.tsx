import { TripSheet } from "../../../components/trip/TripSheet";
import { BTN_PRIMARY, BTN_SECONDARY } from "../styles";

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmation shown by `useConfirmDiscard` when an admin sheet is closed
 * (X, Escape, backdrop or Cancel) while it has unsaved changes. Opens as a
 * second sheet above the form. */
export function DiscardChangesConfirm({ open, onCancel, onConfirm }: Props) {
  return (
    <TripSheet
      open={open}
      onClose={onCancel}
      stacked
      title="Niet-opgeslagen wijzigingen"
      footer={
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className={`flex-1 ${BTN_SECONDARY}`}>
            Blijf hier
          </button>
          <button type="button" onClick={onConfirm} className={`flex-1 ${BTN_PRIMARY}`}>
            Sluiten zonder opslaan
          </button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-ink-2">
        Weet je zeker dat je dit paneel wilt sluiten zonder op te slaan? Je wijzigingen gaan verloren.
      </p>
    </TripSheet>
  );
}
