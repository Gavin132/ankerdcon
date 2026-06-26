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
        className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/[0.05] transition-colors"
      >
        Annuleren
      </button>
      <button
        type="submit"
        form={formId}
        disabled={isPending}
        className="flex-1 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Opslaan..." : isEdit ? "Bijwerken" : "Aanmaken"}
      </button>
    </div>
  );
}
