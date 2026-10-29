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
      <p className="field-label">Soort</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Soort activiteit">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c)}
            aria-pressed={value === c.id}
            className={`chip ${value === c.id ? "chip-on" : "chip-off"}`}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
