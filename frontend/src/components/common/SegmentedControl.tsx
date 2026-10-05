interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

/** The design system's segmented control: one of a few views, equal width. */
export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel }: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex gap-1 rounded-[10px] border-1.5 border-line bg-sunken p-[3px]">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              active ? "bg-surface text-ink shadow-[0_0_0_1.5px_rgb(var(--outline))]" : "text-ink-2 hover:text-ink"
            }`}
          >
            {o.label}
            {o.count !== undefined && <span className="font-mono text-[11px] tabular-nums text-ink-3">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
