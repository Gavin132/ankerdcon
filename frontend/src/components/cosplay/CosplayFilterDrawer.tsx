import { SortAsc, SortDesc, Clock, ArrowUpDown } from "lucide-react";
import { Drawer } from "../common/Drawer";
import { NamePicker } from "../common/NamePicker";
import { Button } from "../common/Button";
import { formatDate } from "../../utils/format";
import type { CalendarEvent } from "../../types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CosplaySortKey = "newest" | "oldest" | "az" | "za";

export interface CosplayFilterState {
  persons: string[];
  days: string[];
  sort: CosplaySortKey;
}

export const DEFAULT_COSPLAY_FILTERS: CosplayFilterState = {
  persons: [],
  days: [],
  sort: "newest",
};

export function cosplayActiveFilterCount(f: CosplayFilterState): number {
  return (
    (f.persons.length > 0 ? 1 : 0) +
    (f.days.length > 0 ? 1 : 0) +
    (f.sort !== "newest" ? 1 : 0)
  );
}

// ── Sort options ──────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "newest" as CosplaySortKey, label: "Nieuwste eerst", Icon: Clock },
  { value: "oldest" as CosplaySortKey, label: "Oudste eerst",   Icon: Clock },
  { value: "az"     as CosplaySortKey, label: "A → Z",          Icon: SortAsc },
  { value: "za"     as CosplaySortKey, label: "Z → A",          Icon: SortDesc },
];

export const SORT_LABELS: Record<CosplaySortKey, string> = {
  newest: "Nieuwste eerst",
  oldest: "Oudste eerst",
  az:     "A → Z",
  za:     "Z → A",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface CosplayFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: CosplayFilterState;
  onChange: (filters: CosplayFilterState) => void;
  onReset: () => void;
  /** Person names that appear in the cosplay list. */
  personOptions: string[];
  /** Event days available (pass empty for single-day events). */
  dayOptions: CalendarEvent[];
}

// ── Section helpers ───────────────────────────────────────────────────────────

const SECTION = "space-y-3 rounded-2xl border border-slate-100 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.03] p-4";
const SECTION_TITLE = "text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1";

// ── Component ─────────────────────────────────────────────────────────────────

export function CosplayFilterDrawer({
  open,
  onClose,
  filters,
  onChange,
  onReset,
  personOptions,
  dayOptions,
}: CosplayFilterDrawerProps) {
  const activeCount = cosplayActiveFilterCount(filters);

  function setSort(sort: CosplaySortKey) {
    onChange({ ...filters, sort });
  }

  function setPersons(persons: string[]) {
    onChange({ ...filters, persons });
  }

  function toggleDay(dayId: string) {
    const days = filters.days.includes(dayId)
      ? filters.days.filter((d) => d !== dayId)
      : [...filters.days, dayId];
    onChange({ ...filters, days });
  }

  const footer = (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        className="flex-1"
        onClick={onReset}
        disabled={activeCount === 0}
      >
        Filters wissen
        {activeCount > 0 && (
          <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 text-[9px] font-bold text-violet-600 dark:text-violet-400">
            {activeCount}
          </span>
        )}
      </Button>
      <Button className="flex-1" onClick={onClose}>
        Toepassen
      </Button>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Filter & Sorteren"
      subtitle="Vind het cosplay dat je zoekt"
      footer={footer}
    >
      <div className="space-y-5">

        {/* ── Sort ── */}
        <div className={SECTION}>
          <p className={SECTION_TITLE}>Sortering</p>
          <div className="grid grid-cols-2 gap-2">
            {SORT_OPTIONS.map(({ value, label, Icon }) => {
              const active = filters.sort === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSort(value)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    active
                      ? "border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-sm"
                      : "border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] hover:border-violet-300 dark:hover:border-violet-700/50"
                  }`}
                >
                  <Icon
                    size={14}
                    className={active ? "text-violet-500" : "text-slate-400"}
                  />
                  <span
                    className={`text-xs font-semibold leading-tight ${
                      active
                        ? "text-violet-700 dark:text-violet-300"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {label}
                  </span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Filter by person ── */}
        {personOptions.length > 0 && (
          <div className={SECTION}>
            <p className={SECTION_TITLE}>
              Persoon
              {filters.persons.length > 0 && (
                <span className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[8px] font-bold text-white">
                  {filters.persons.length}
                </span>
              )}
            </p>
            <NamePicker
              multiple
              options={personOptions}
              value={filters.persons}
              onChange={setPersons}
              placeholder="Zoek persoon…"
              color="violet"
            />
            {filters.persons.length === 0 && (
              <p className="text-xs text-slate-400">
                Selecteer één of meer personen om te filteren.
              </p>
            )}
          </div>
        )}

        {/* ── Filter by day ── */}
        {dayOptions.length > 1 && (
          <div className={SECTION}>
            <p className={SECTION_TITLE}>
              Dag
              {filters.days.length > 0 && (
                <span className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[8px] font-bold text-white">
                  {filters.days.length}
                </span>
              )}
            </p>
            <div className="space-y-2">
              {dayOptions.map((e) => {
                const selected = filters.days.includes(e.id);
                return (
                  <label
                    key={e.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                      selected
                        ? "border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                        : "border-slate-200 dark:border-white/[0.08] hover:border-violet-300 dark:hover:border-violet-600/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded accent-violet-500 shrink-0"
                      checked={selected}
                      onChange={() => toggleDay(e.id)}
                    />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {formatDate(e.date)}
                    </span>
                    <span className="text-xs text-slate-400 ml-auto truncate max-w-[8rem]">
                      {e.event_name}
                    </span>
                  </label>
                );
              })}
            </div>
            {filters.days.length === 0 && (
              <p className="text-xs text-slate-400">Alle dagen worden getoond.</p>
            )}
          </div>
        )}

        {/* No filter options available */}
        {personOptions.length === 0 && dayOptions.length <= 1 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400">
            <ArrowUpDown size={22} className="opacity-40" />
            <p className="text-xs">Alleen sortering beschikbaar.<br />Voeg meer cosplays toe om filteropties te zien.</p>
          </div>
        )}
      </div>
    </Drawer>
  );
}
