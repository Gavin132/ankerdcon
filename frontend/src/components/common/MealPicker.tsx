import { useState, useRef, useEffect } from "react";
import { Search, X, Utensils, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Meal } from "../../types";

interface MealPickerProps {
  meals: Meal[];
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  placeholder?: string;
}

function formatMealTime(time: string) {
  const d = new Date(time);
  if (isNaN(d.getTime())) return time;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) +
    " · " +
    d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

export function MealPicker({
  meals,
  value,
  onChange,
  placeholder = "Zoek eetafspraak…",
}: MealPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedMeal = value ? meals.find((m) => m.id === value) : undefined;

  const filtered = meals
    .filter((m) => m.meal_name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  useEffect(() => {
    if (!open) return;
    function onOutside(e: PointerEvent) {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setQuery("");
    }
    document.addEventListener("pointerdown", onOutside, true);
    return () => document.removeEventListener("pointerdown", onOutside, true);
  }, [open]);

  function handleSelect(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  function handleClear() {
    onChange(undefined);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="space-y-1.5">
      <AnimatePresence>
        {selectedMeal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2">
              <Utensils size={14} className="shrink-0 text-amber-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 truncate">
                  {selectedMeal.meal_name}
                </p>
                <p className="text-[11px] text-amber-600/70 dark:text-amber-400/70">
                  {formatMealTime(selectedMeal.time)}
                  {selectedMeal.location ? ` · ${selectedMeal.location}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <Search
          size={13}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          className="input-field pl-8"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          autoComplete="off"
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="max-h-[220px] overflow-y-auto overscroll-contain rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg divide-y divide-slate-50 dark:divide-slate-800"
          >
            {filtered.length === 0 ? (
              <p className="px-4 py-4 text-center text-xs text-slate-400">
                {query ? `Geen resultaten voor "${query}"` : "Geen eetafspraken beschikbaar"}
              </p>
            ) : (
              filtered.map((meal) => {
                const isSelected = meal.id === value;
                return (
                  <button
                    key={meal.id}
                    type="button"
                    onClick={() => handleSelect(meal.id)}
                    className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors min-h-[48px] ${
                      isSelected
                        ? "bg-amber-50 dark:bg-amber-500/10"
                        : "hover:bg-slate-50 active:bg-slate-50 dark:hover:bg-slate-800/60 dark:active:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/15">
                      <Utensils size={15} className="text-amber-500" />
                    </div>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {meal.meal_name}
                      </span>
                      <span className="block text-[11px] text-slate-400 truncate">
                        {formatMealTime(meal.time)}
                        {meal.location ? ` · ${meal.location}` : ""}
                      </span>
                    </span>
                    {isSelected && (
                      <Check size={15} className="shrink-0 text-amber-500" />
                    )}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
