import { useState, useRef, useEffect } from "react";
import { Search, X, CalendarDays, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CalendarEvent } from "../../types";
import { formatDate } from "../../utils/format";
import { parseEventDate } from "../../utils/date";
import { getNow } from "../../store/time.store";
import { dayShort } from "../../utils/multiDay";

/** "Vr 12 september 2026" — the two-letter day makes it much faster to
 * scan a list of dates for the specific day you're planning around. */
function formatDateWithDay(dateStr: string): string {
  const date = parseEventDate(dateStr);
  const formatted = formatDate(dateStr);
  if (!date) return formatted;
  const short = dayShort(date);
  return `${short.charAt(0).toUpperCase()}${short.slice(1)} ${formatted}`;
}

/** Events further back than this aren't offered — nobody links a new expense to something from last year. */
const PICKABLE_MONTHS_BACK = 2;

interface EventPickerProps {
  events: CalendarEvent[];
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  placeholder?: string;
}

export function EventPicker({
  events,
  value,
  onChange,
  placeholder = "Zoek event…",
}: EventPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedEvent = value ? events.find((e) => e.id === value) : undefined;

  const cutoff = getNow();
  cutoff.setMonth(cutoff.getMonth() - PICKABLE_MONTHS_BACK);

  const filtered = events
    .filter((e) => {
      // An event that's already picked stays listed, however old.
      if (e.id === value) return true;
      const date = parseEventDate(e.date);
      return !date || date >= cutoff;
    })
    .filter((e) => e.event_name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
      {/* Selected chip */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-xl border-1.5 border-outline bg-surface px-3 py-2">
              <CalendarDays size={14} className="shrink-0 text-ink" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink truncate">
                  {selectedEvent.event_name}
                </p>
                <p className="font-mono text-[11px] text-ink-3">
                  {formatDateWithDay(selectedEvent.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-sunken transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search input */}
      <div className="relative">
        <Search
          size={13}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
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

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="max-h-[220px] overflow-y-auto overscroll-contain rounded-xl border-1.5 border-line bg-surface shadow-xl divide-y divide-line"
          >
            {filtered.length === 0 ? (
              <p className="px-4 py-4 text-center text-xs text-ink-3">
                {query ? `Geen resultaten voor "${query}"` : "Geen events beschikbaar"}
              </p>
            ) : (
              filtered.map((event) => {
                const isSelected = event.id === value;
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => handleSelect(event.id)}
                    className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors min-h-[48px] ${
                      isSelected
                        ? "bg-sunken"
                        : "hover:bg-sunken active:bg-sunken"
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken">
                      <CalendarDays size={15} className="text-ink" />
                    </div>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-ink truncate">
                        {event.event_name}
                      </span>
                      <span className="block text-[11px] text-ink-3 truncate">
                        {formatDateWithDay(event.date)}
                        {event.location ? ` · ${event.location}` : ""}
                      </span>
                    </span>
                    {isSelected && (
                      <Check size={15} className="shrink-0 text-ink" />
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
