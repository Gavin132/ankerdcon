import { useRef, useEffect } from "react";
import { BedDouble } from "lucide-react";
import { dayShort, monthShort } from "../../utils/multiDay";
import type { CalendarEvent } from "../../types";

interface DayStripProps {
  days: { ev: CalendarEvent; date: Date }[];
  currentId: string;
  onNavigate: (id: string) => void;
}

export function DayStrip({ days, currentId, onNavigate }: DayStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>("[data-active='true']");
    if (!active) return;
    const offset = active.offsetLeft - container.clientWidth / 2 + active.clientWidth / 2;
    container.scrollTo({ left: offset, behavior: "smooth" });
  }, [currentId]);

  return (
    <div className="bg-slate-100 dark:bg-[#111827] border-b border-slate-200 dark:border-slate-700/60 sticky top-0 z-10">
      <div
        ref={scrollRef}
        className="max-w-4xl mx-auto px-4 py-2.5 flex items-center gap-2 overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {days.map((d, i) => {
          const isActive = d.ev.id === currentId;
          const isTravelDay = d.ev.has_con === false;
          return (
            <button
              key={d.ev.id}
              type="button"
              data-active={isActive}
              onClick={() => onNavigate(d.ev.id)}
              className={`shrink-0 flex items-center gap-2 rounded-xl px-4 py-2 transition-all duration-150 whitespace-nowrap ${
                isActive
                  ? isTravelDay
                    ? "bg-teal-600 dark:bg-teal-500 shadow-sm"
                    : "bg-slate-900 dark:bg-white shadow-sm"
                  : isTravelDay
                    ? "bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 hover:border-teal-300 dark:hover:border-teal-700"
                    : "bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              {isTravelDay ? (
                <BedDouble
                  size={10}
                  className={isActive ? "text-white/70" : "text-teal-500 dark:text-teal-400"}
                />
              ) : (
                <span
                  className={`text-[9px] font-black uppercase tracking-widest ${
                    isActive
                      ? "text-white/50 dark:text-slate-900/50"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {i + 1}
                </span>
              )}
              <span
                className={`text-[13px] font-bold leading-none ${
                  isActive
                    ? isTravelDay ? "text-white" : "text-white dark:text-slate-900"
                    : isTravelDay ? "text-teal-700 dark:text-teal-300" : "text-slate-700 dark:text-slate-300"
                }`}
              >
                {dayShort(d.date)} {d.date.getDate()} {monthShort(d.date)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
