interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  /** Names the switch when there is no visible label to point at. */
  label?: string;
  /** The id of the element that names it, when the label is on screen. */
  labelledBy?: string;
}

/** The on/off switch used wherever a setting is a yes or no (Instellingen, Meldingen). */
export function Switch({ checked, onChange, disabled, label, labelledBy }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={onChange}
      className={`hit-area relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-1.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-text focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-60 ${
        checked ? "border-outline bg-brand" : "border-line bg-sunken"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full transition-transform duration-200 ${
          checked ? "translate-x-[22px] bg-brand-on" : "translate-x-[3px] bg-ink-3"
        }`}
      />
    </button>
  );
}
