import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Archive, ChevronDown, CalendarDays } from "lucide-react";
import { avatarColor, personInitial } from "../../utils/avatar";
import { parseEventDate, toDateKey, todayKey } from "../../utils/date";
import type { CalendarEvent } from "../../types";

interface CalendarArchiveProps {
  events: CalendarEvent[];
}

export function CalendarArchive({ events }: CalendarArchiveProps) {
  const [open, setOpen] = useState(false);

  const today = todayKey();
  const sorted = events
    .map((ev) => ({ ev, date: parseEventDate(ev.date) }))
    .filter(({ date }) => date !== null)
    .sort((a, b) => b.date!.getTime() - a.date!.getTime());

  if (sorted.length === 0) return null;

  const byYear = new Map<number, typeof sorted>();
  for (const entry of sorted) {
    const yr = entry.date!.getFullYear();
    if (!byYear.has(yr)) byYear.set(yr, []);
    byYear.get(yr)!.push(entry);
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between mb-3 group"
      >
        <p className="section-label flex items-center gap-2">
          <Archive size={13} className="text-slate-400" />
          Alle evenementen ({sorted.length})
        </p>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-400 group-hover:text-slate-600 transition-colors"
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="space-y-3">
              {Array.from(byYear.entries()).map(([year, entries]) => (
                <div key={year}>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">
                    {year}
                  </p>
                  <div className="card-surface rounded-2xl divide-y divide-slate-50 overflow-hidden">
                    {entries.map(({ ev, date }) => {
                      const isPast = toDateKey(date!) < today;
                      return (
                        <div key={ev.event_id} className="flex items-center gap-3 px-4 py-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              isPast ? "bg-slate-100" : "gradient-brand"
                            }`}
                          >
                            <CalendarDays
                              size={14}
                              className={isPast ? "text-slate-400" : "text-white"}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-bold truncate ${
                                isPast ? "text-slate-400" : "text-slate-800"
                              }`}
                            >
                              {ev.event_name}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {ev.date}
                              {ev.is_hotel && " · Hotel"}
                            </p>
                          </div>
                          {ev.participants.length > 0 && (
                            <div className="flex -space-x-1.5 shrink-0">
                              {ev.participants.slice(0, 4).map((p) => (
                                <div
                                  key={p}
                                  title={p}
                                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br text-xs font-black text-white ${avatarColor(p)}`}
                                >
                                  {personInitial(p)}
                                </div>
                              ))}
                              {ev.participants.length > 4 && (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-xs font-bold text-slate-500">
                                  +{ev.participants.length - 4}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
