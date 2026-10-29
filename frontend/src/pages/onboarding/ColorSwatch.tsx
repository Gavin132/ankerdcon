import { Check } from "lucide-react";

interface ColorSwatchProps {
  value: string;
  onChange: (v: string) => void;
  presets: string[];
}

export function ColorSwatch({ value, onChange, presets }: ColorSwatchProps) {
  return (
    <div className="flex flex-wrap gap-2.5">
      <button
        type="button"
        onClick={() => onChange("")}
        title="Automatisch"
        aria-label="Automatische kleur"
        aria-pressed={value === ""}
        className={`hit-area flex h-9 w-9 items-center justify-center rounded-full border-1.5 border-line bg-sunken ring-2 ring-offset-2 ring-offset-paper transition-shadow ${
          value === "" ? "ring-outline" : "ring-transparent hover:ring-line"
        }`}
      >
        {value === "" && <Check size={10} strokeWidth={3} className="text-ink" />}
      </button>
      {presets.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(value === c ? "" : c)}
          title={c}
          aria-label={`Kleur ${c}`}
          aria-pressed={value === c}
          className={`hit-area flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-paper transition-shadow ${
            value === c ? "ring-outline" : "ring-transparent hover:ring-line"
          }`}
          style={{ backgroundColor: c }}
        >
          {value === c && <Check size={10} strokeWidth={3} className="text-white" />}
        </button>
      ))}
    </div>
  );
}
