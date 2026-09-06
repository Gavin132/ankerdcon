import { BedDouble, ChevronRight, MapPin } from "lucide-react";
import type { CalendarEvent } from "../../types";

interface HotelInfoCardProps {
  event: CalendarEvent;
  onHotelClick: () => void;
}

/** Shown in place of con-day content on a hotel-only travel day. */
export function HotelInfoCard({ event, onHotelClick }: HotelInfoCardProps) {
  const location = event.hotel_location || event.location;

  return (
    <div className="rounded-2xl border border-teal-200/80 dark:border-teal-800/60 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
      <div className="h-[3px] bg-gradient-to-r from-teal-400 to-teal-600" />

      <div className="px-5 pt-4 pb-1 flex items-center gap-2">
        <BedDouble size={13} className="text-teal-500" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600/80 dark:text-teal-400/70">
          Hotel &amp; overnachting
        </p>
      </div>

      {location && (
        <div className="flex items-start gap-4 px-5 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-500/10 mt-0.5">
            <MapPin size={14} className="text-teal-600 dark:text-teal-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
              Locatie
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {location}
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onHotelClick}
        className="w-full flex items-center gap-4 px-5 py-4 text-left border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-white/[0.02] active:bg-slate-100 dark:active:bg-white/[0.04] transition-colors group"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-500/15">
          <BedDouble size={14} className="text-teal-600 dark:text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Bekijk hotelkamers
          </p>
        </div>
        <ChevronRight
          size={15}
          className="shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors"
        />
      </button>
    </div>
  );
}
