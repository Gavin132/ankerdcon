import { Check, Plus, Slash } from "lucide-react";

interface ColorSwatchProps {
  value: string;
  onChange: (v: string) => void;
  presets: string[];
  /** Also offer a colour of their own; this is what the picker starts on. */
  customFallback?: string;
  /** The ring is cut out in the colour of what the dots sit on: a card (default) or the page (`paper`). */
  on?: "surface" | "paper";
}

/** One row of colour dots: "automatic" (a slash), the presets and, if asked, a round "choose your own". 36 px to look at, 8 px apart. */
export function ColorSwatch({ value, onChange, presets, customFallback, on = "surface" }: ColorSwatchProps) {
  const offset = on === "paper" ? "ring-offset-paper" : "ring-offset-surface";
  return (
    <div role="group" className="flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        onClick={() => onChange("")}
        aria-pressed={value === ""}
        aria-label="Automatische kleur"
        title="Automatisch"
        className={`hit-area flex h-9 w-9 items-center justify-center rounded-full border-1.5 border-line bg-sunken text-ink-3 ring-2 ring-offset-2 ${offset} transition-shadow ${
          value === "" ? "ring-outline" : "ring-transparent hover:ring-line"
        }`}
      >
        {value === "" ? <Check size={12} strokeWidth={3} className="text-ink" /> : <Slash size={14} />}
      </button>

      {presets.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(value === c ? "" : c)}
          aria-pressed={value === c}
          aria-label={`Kleur ${c}`}
          title={c}
          className={`hit-area flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-offset-2 ${offset} transition-shadow ${
            value === c ? "ring-outline" : "ring-transparent hover:ring-line"
          }`}
          style={{ backgroundColor: c }}
        >
          {value === c && <Check size={12} strokeWidth={3} className="text-avatar-on" />}
        </button>
      ))}

      {customFallback && (
        <div className="relative h-9 w-9">
          <input
            type="color"
            value={value || customFallback}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Aangepaste kleur"
            title="Aangepaste kleur"
            className="absolute inset-0 z-10 h-full w-full cursor-pointer rounded-full opacity-0"
          />
          <div className="flex h-9 w-9 items-center justify-center rounded-full border-1.5 border-dashed border-ink-3 bg-surface text-ink-2">
            <Plus size={14} />
          </div>
        </div>
      )}
    </div>
  );
}
