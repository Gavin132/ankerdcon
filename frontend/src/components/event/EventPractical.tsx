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
  /** When true, renders only the row content — no card surface or
   * "Praktische info" label — for embedding inside a parent card. */
  bare?: boolean;
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
  bare = false,
}: EventPracticalProps) {
  const rows = buildRows(event);
  const showHotelRow = showHotel && !!event.is_hotel;

  if (rows.length === 0 && !showHotelRow) return null;

  const hotelOccupantCount = new Set(hotelRooms.flatMap((r) => r.occupants)).size;

  const content = (
      <div className="divide-y divide-line">
        {rows.map((row, i) =>
          row.accent ? (
            /* Special instructions — amber accent row */
            <div
              key={i}
              className="flex items-start gap-4 bg-amber-50 px-5 py-4 dark:bg-amber-500/10"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                <row.icon size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.09em] text-amber-800 dark:text-amber-300">
                  {row.label}
                </p>
                <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-amber-900 dark:text-amber-200">
                  {row.content}
                </p>
              </div>
            </div>
          ) : (
            /* Standard row */
            <div key={i} className="flex items-start gap-4 px-5 py-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                <row.icon size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="section-label mb-1">
                  {row.label}
                </p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink">
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
            className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-sunken"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink group-hover:bg-surface">
              <BedDouble size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="section-label mb-0.5">
                Hotelkamers
              </p>
              {hotelRooms.length === 0 ? (
                <p className="text-sm text-ink-3">Nog geen kamers aangemaakt</p>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-sm text-ink-2">
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
                              className="h-5 w-5 text-[7px] !border-[1.5px] !border-surface"
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
              className="shrink-0 text-ink-3 transition-colors group-hover:text-ink"
            />
          </button>
        )}
      </div>
  );

  if (bare) return content;

  return (
    <div className="card-surface overflow-hidden">
      <div className="px-5 pb-1 pt-4">
        <p className="section-label">
          Praktische info
        </p>
      </div>

      {content}
    </div>
  );
}
