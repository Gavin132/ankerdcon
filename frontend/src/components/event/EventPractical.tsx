import { AlertCircle, BedDouble, ChevronRight, Lock, Package, ParkingCircle } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import type { CalendarEvent, User } from "../../types";

interface HotelRoom {
  id: string;
  occupants: string[];
}

interface EventPracticalProps {
  event: CalendarEvent;
  showHotel?: boolean;
  hotelRooms?: HotelRoom[];
  participantCount?: number;
  users?: User[];
  isAdmin?: boolean;
  onHotelClick?: () => void;
}

interface PracticalRow {
  icon: React.ElementType;
  label: string;
  content: string;
  accent: boolean;
}

function buildRows(event: CalendarEvent): PracticalRow[] {
  return [
    event.special_instructions && { icon: AlertCircle,    label: "Let op",        content: event.special_instructions, accent: true  },
    event.parking_info         && { icon: ParkingCircle,  label: "Parkeren",      content: event.parking_info,         accent: false },
    event.what_to_bring        && { icon: Package,        label: "Wat meenemen",  content: event.what_to_bring,        accent: false },
    event.locker_info          && { icon: Lock,           label: "Lockers",       content: event.locker_info,          accent: false },
  ].filter(Boolean) as PracticalRow[];
}

export function EventPractical({
  event,
  showHotel = false,
  hotelRooms = [],
  participantCount = 0,
  users = [],
  onHotelClick,
}: EventPracticalProps) {
  const rows = buildRows(event);
  const showHotelRow = showHotel && !!event.is_hotel;

  if (rows.length === 0 && !showHotelRow) return null;

  const hotelOccupantCount = new Set(hotelRooms.flatMap((r) => r.occupants)).size;

  return (
    <div className="card-surface rounded-2xl overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-sky-400 via-violet-400 to-emerald-400" />

      <div className="px-5 pt-4 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Praktische info
        </p>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
        {rows.map((row, i) =>
          row.accent ? (
            /* Special instructions — amber accent row */
            <div
              key={i}
              className="flex items-start gap-4 px-5 py-4 bg-amber-50/60 dark:bg-amber-500/[0.06]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/15 mt-0.5">
                <row.icon size={14} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/70 dark:text-amber-400/60 mb-1">
                  {row.label}
                </p>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-300 leading-relaxed whitespace-pre-line">
                  {row.content}
                </p>
              </div>
            </div>
          ) : (
            /* Standard row */
            <div key={i} className="flex items-start gap-4 px-5 py-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 mt-0.5">
                <row.icon size={14} className="text-slate-500 dark:text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                  {row.label}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {row.content}
                </p>
              </div>
            </div>
          )
        )}

        {/* Hotel row */}
        {showHotelRow && (
          <button
            type="button"
            onClick={onHotelClick}
            className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/[0.02] active:bg-slate-100 dark:active:bg-white/[0.04] transition-colors group"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/10">
              <BedDouble size={14} className="text-sky-600 dark:text-sky-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">
                Hotelkamers
              </p>
              {hotelRooms.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Nog geen kamers aangemaakt</p>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {hotelRooms.length} {hotelRooms.length === 1 ? "kamer" : "kamers"}
                    {hotelOccupantCount > 0 && ` · ${hotelOccupantCount} van ${participantCount} ingedeeld`}
                  </p>
                  {hotelRooms.length > 0 && (
                    <div className="flex -space-x-1.5">
                      {hotelRooms
                        .slice(0, 3)
                        .flatMap((r) => r.occupants.slice(0, 2))
                        .slice(0, 5)
                        .map((name, i) => {
                          const u = users.find(
                            (x) => x.name === name || x.discord_username === name || x.aliases?.includes(name),
                          );
                          return (
                            <UserAvatar
                              key={`${name}-${i}`}
                              name={u?.name ?? name}
                              user={u}
                              className="h-5 w-5 text-[7px] ring-[1.5px] ring-white dark:ring-slate-900"
                            />
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <ChevronRight
              size={15}
              className="shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors"
            />
          </button>
        )}
      </div>
    </div>
  );
}
