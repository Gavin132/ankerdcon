import type { ReactNode } from "react";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  /** Spoken label when `label` is not plain text. */
  ariaLabel?: string;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** What the group is for, read out by a screen reader ("Weergave", "Jaar"). */
  label: string;
  /** Stretch over the full width and share it between the items. */
  fill?: boolean;
  /** Many items (years): scroll sideways instead of growing past the screen. */
  scroll?: boolean;
  className?: string;
}

/** Pick one of a few views of the same thing. Looks and sizes come from `.segmented` (index.css). */
export function Segmented<T extends string>({ options, value, onChange, label, fill, scroll, className = "" }: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`segmented ${fill ? "flex w-full" : ""} ${scroll ? "overflow-x-auto" : ""} ${className}`}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          aria-label={o.ariaLabel}
          className={`segmented-item ${fill ? "flex-1" : ""}`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
