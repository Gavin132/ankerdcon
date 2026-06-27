import { useState, useRef, useEffect } from "react";
import { Search, X, CalendarDays, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CalendarEvent } from "../../types";
import { formatDate } from "../../utils/format";

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

  const filtered = events
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
            <div className="flex items-center gap-2 rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 px-3 py-2">
              <CalendarDays size={14} className="shrink-0 text-sky-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sky-800 dark:text-sky-300 truncate">
                  {selectedEvent.event_name}
                </p>
                <p className="text-[11px] text-sky-600/70 dark:text-sky-400/70">
                  {formatDate(selectedEvent.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg text-sky-400 hover:text-sky-600 dark:hover:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors"
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

      {/* Dropdown */}
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
                        ? "bg-sky-50 dark:bg-sky-500/10"
                        : "hover:bg-slate-50 active:bg-slate-50 dark:hover:bg-slate-800/60 dark:active:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/15">
                      <CalendarDays size={15} className="text-sky-500" />
                    </div>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {event.event_name}
                      </span>
                      <span className="block text-[11px] text-slate-400 truncate">
                        {formatDate(event.date)}
                        {event.location ? ` · ${event.location}` : ""}
                      </span>
                    </span>
                    {isSelected && (
                      <Check size={15} className="shrink-0 text-sky-500" />
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
