import { SortAsc, SortDesc, Clock, ArrowUpDown } from "lucide-react";
import { NamePicker } from "../common/NamePicker";
import { Button } from "../common/Button";
import { SelectableDayCards } from "../trip/SelectableDayCards";
import type { TripDay } from "../../utils/trips";

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

interface CosplayFilterPanelProps {
  filters: CosplayFilterState;
  onChange: (filters: CosplayFilterState) => void;
  /** Person names that appear in the cosplay list. */
  personOptions: string[];
  /** The trip's days; the day filter only shows for a multi-day trip. */
  days: TripDay[];
  /** How many cosplays are planned per day (by event id), for the day cards. */
  countByDay: Record<string, number>;
}

// ── Section helpers ───────────────────────────────────────────────────────────

// Flat sections separated by a divider.
const SECTION = "space-y-3 border-t-1.5 border-line pt-5 first:border-t-0 first:pt-0";
const SECTION_TITLE = "section-label flex items-center";

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Filter & sort options for the cosplay list. This is a *view of the cosplay
 * sheet* (which swaps to it with a back arrow), not an overlay of its own, so
 * it looks and behaves like the rest of the sheets instead of the older
 * full-height side drawer it used to be.
 */
export function CosplayFilterPanel({ filters, onChange, personOptions, days, countByDay }: CosplayFilterPanelProps) {
  function setSort(sort: CosplaySortKey) {
    onChange({ ...filters, sort });
  }

  function setPersons(persons: string[]) {
    onChange({ ...filters, persons });
  }

  function toggleDay(dayId: string) {
    const picked = filters.days.includes(dayId)
      ? filters.days.filter((d) => d !== dayId)
      : [...filters.days, dayId];
    onChange({ ...filters, days: picked });
  }

  return (
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
                  aria-pressed={active}
                  className={`flex items-center gap-2 rounded-xl border-1.5 px-3 py-2.5 text-left transition-colors ${
                    active
                      ? "border-brand-text bg-brand-soft"
                      : "border-line bg-surface text-ink-2 hover:border-ink-3"
                  }`}
                >
                  <Icon size={14} className={`shrink-0 ${active ? "text-brand-text" : "text-ink-3"}`} />
                  <span className="text-xs font-semibold leading-tight text-ink">{label}</span>
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
                <span className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-ink font-mono text-[9.5px] font-semibold text-paper dark:bg-brand dark:text-brand-on">
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
              color="sky"
            />
            {filters.persons.length === 0 && (
              <p className="text-xs text-ink-3">Selecteer één of meer personen om te filteren.</p>
            )}
          </div>
        )}

        {/* ── Filter by day ── */}
        {days.length > 1 && (
          <div className={SECTION}>
            <p className={SECTION_TITLE}>
              Dag
              {filters.days.length > 0 && (
                <span className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-ink font-mono text-[9.5px] font-semibold text-paper dark:bg-brand dark:text-brand-on">
                  {filters.days.length}
                </span>
              )}
            </p>
            <SelectableDayCards
              days={days}
              selected={filters.days}
              onToggle={toggleDay}
              caption={(d) => {
                const n = countByDay[d.ev.id] ?? 0;
                return `${n} ${n === 1 ? "cosplay" : "cosplays"}`;
              }}
              label="Filter op dag"
            />
            {filters.days.length === 0 && <p className="text-xs text-ink-3">Alle dagen worden getoond.</p>}
          </div>
        )}

        {/* No filter options available */}
        {personOptions.length === 0 && days.length <= 1 && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3">
              <ArrowUpDown size={22} />
            </div>
            <p className="text-xs text-ink-3">Alleen sortering beschikbaar.<br />Voeg meer cosplays toe om filteropties te zien.</p>
          </div>
        )}
      </div>
  );
}

/** The sheet's footer while the filter view is open. */
export function CosplayFilterFooter({ activeCount, onReset, onDone }: { activeCount: number; onReset: () => void; onDone: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" className="flex-1" onClick={onReset} disabled={activeCount === 0}>
        Filters wissen
        {activeCount > 0 && (
          <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink font-mono text-[9.5px] font-semibold text-paper dark:bg-brand dark:text-brand-on">
            {activeCount}
          </span>
        )}
      </Button>
      <Button className="flex-1" onClick={onDone}>
        Toepassen
      </Button>
    </div>
  );
}
