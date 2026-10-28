interface Props {
  checked: boolean;
  onChange: () => void;
  /** Names the box for a screen reader: "Selecteer Sam", "Selecteer alles". */
  label: string;
  indeterminate?: boolean;
}

/**
 * The checkbox of a table row (and of the "select all" in the header). The box is 16 px, but the label around
 * it is 44 px to hit; the negative margin gives that room back, so the row does not grow. A table cell on a phone
 * has no padding (`.stack-table`), which is why the box cannot just get `hit-area`.
 */
export function RowCheckbox({ checked, onChange, label, indeterminate }: Props) {
  return (
    <label className="-m-3 flex h-11 w-11 cursor-pointer items-center justify-center" onClick={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        className="cb"
        checked={checked}
        ref={(el) => { if (el) el.indeterminate = !!indeterminate; }}
        onChange={onChange}
        aria-label={label}
      />
    </label>
  );
}
