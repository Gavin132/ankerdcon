const SEATS = [2, 3, 4, 5, 6, 7];

interface SeatPickerProps {
  value: number;
  onChange: (seats: number) => void;
}

/** How many seats a car has, the driver included: one row of 2 to 7, the same in every sheet that asks. */
export function SeatPicker({ value, onChange }: SeatPickerProps) {
  return (
    <div>
      <label className="field-label" id="seat-picker-label">Totaal aantal plekken in je auto</label>
      <div role="group" aria-labelledby="seat-picker-label" className="flex gap-2">
        {SEATS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={value === n}
            className={`chip flex-1 px-0 tabular-nums ${value === n ? "chip-on" : "chip-off"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-ink-3">Incl. jezelf</p>
    </div>
  );
}
