import type { MealCategory } from "../../types";

interface CategoryPickerProps {
  categories: MealCategory[];
  value: string;
  onChange: (category: MealCategory) => void;
}

/** One chip per kind of activity (Eten, Groepsfoto, ...). Hidden when there is nothing to choose from. */
export function CategoryPicker({ categories, value, onChange }: CategoryPickerProps) {
  if (categories.length === 0) return null;
  return (
    <div>
      <p className="section-label mb-2">Soort</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Soort activiteit">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c)}
            aria-pressed={value === c.id}
            className={`rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors ${
              value === c.id ? "border-2 border-outline bg-brand text-brand-on" : "border-1.5 border-line bg-surface text-ink-2 hover:border-ink-3"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
