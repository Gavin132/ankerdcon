import { ChevronRight } from "lucide-react";
import { AvatarStack } from "../common/AvatarStack";
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
  label: string;
  content: string;
  accent: boolean;
}

function buildRows(event: CalendarEvent): PracticalRow[] {
  return [
    event.special_instructions && { label: "Let op",       content: event.special_instructions, accent: true  },
    event.parking_info         && { label: "Parkeren",     content: event.parking_info,         accent: false },
    event.what_to_bring        && { label: "Wat meenemen", content: event.what_to_bring,        accent: false },
    event.locker_info          && { label: "Lockers",      content: event.locker_info,          accent: false },
  ].filter(Boolean) as PracticalRow[];
}

export function EventPractical({
  event,
  showHotel = false,
  hotelRooms = [],
  participantCount = 0,
  onHotelClick,
  bare = false,
}: EventPracticalProps) {
  const rows = buildRows(event);
  const showHotelRow = showHotel && !!event.is_hotel;

  if (rows.length === 0 && !showHotelRow) return null;

  // Inside a sheet the sheet already has its own side padding; in a card the rows bring theirs.
  const pad = bare ? "py-3.5" : "px-5 py-4";
  const hotelOccupantCount = new Set(hotelRooms.flatMap((r) => r.occupants)).size;

  const content = (
      <div className="divide-y divide-line">
        {rows.map((row, i) =>
          row.accent ? (
            /* Special instructions — amber accent row */
            <div key={i} className={bare ? "py-3.5" : ""}>
              <div className={`${bare ? "notice-warn px-4 py-3" : "bg-warn-soft px-5 py-4"}`}>
                <p className="section-label mb-1 text-warn">
                  {row.label}
                </p>
                <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-warn">
                  {row.content}
                </p>
              </div>
            </div>
          ) : (
            /* Standard row */
            <div key={i} className={pad}>
              <p className="section-label mb-1">
                {row.label}
              </p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink">
                {row.content}
              </p>
            </div>
          )
        )}

        {/* Hotel row */}
        {showHotelRow && (
          <button
            type="button"
            onClick={onHotelClick}
            className={`group flex w-full items-center gap-4 text-left transition-colors hover:bg-sunken ${pad}`}
          >
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
                  <AvatarStack names={hotelRooms.flatMap((r) => r.occupants)} size="xs" max={5} />
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
