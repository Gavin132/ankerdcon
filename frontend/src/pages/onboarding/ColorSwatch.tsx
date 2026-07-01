import { Check } from "lucide-react";

interface ColorSwatchProps {
  value: string;
  onChange: (v: string) => void;
  presets: string[];
}

export function ColorSwatch({ value, onChange, presets }: ColorSwatchProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("")}
        title="Automatisch"
        className={`h-7 w-7 rounded-full transition-all hover:scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 ${
          value === "" ? "ring-sky-500 scale-110" : "ring-transparent"
        }`}
        style={{ background: "linear-gradient(135deg, #cbd5e1, #94a3b8)" }}
      >
        {value === "" && <Check size={9} className="m-auto text-white drop-shadow" />}
      </button>
      {presets.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(value === c ? "" : c)}
          title={c}
          className={`h-7 w-7 rounded-full transition-all hover:scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 ${
            value === c ? "ring-sky-500 scale-110" : "ring-transparent"
          }`}
          style={{ backgroundColor: c }}
        >
          {value === c && <Check size={9} className="m-auto text-white drop-shadow" />}
        </button>
      ))}
    </div>
  );
}
