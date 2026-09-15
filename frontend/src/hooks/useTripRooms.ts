import { useMemo } from "react";
import { useCalendar, useHotelRooms } from "./useCalendar";
import { buildTrip, currentTripId, isTripOver } from "../utils/trips";

/**
 * Room number per person for the current trip, taken from the actual room
 * assignments (Event › Kamers). This is the one source for "Kamer X" labels —
 * the old free-text `user.hotel_room` field could disagree with it.
 * Keys are lower-cased names; people without a numbered room are absent.
 */
export function useCurrentTripRoomNumbers(): Map<string, string> {
  const { data: events = [] } = useCalendar();
  const tripId = currentTripId(events);
  const trip = tripId ? buildTrip(events, tripId) : null;
  const hotelDay = trip && !isTripOver(trip) ? trip.days.find((d) => d.ev.is_hotel)?.ev : undefined;
  const { data: rooms = [] } = useHotelRooms(hotelDay?.id ?? "", { enabled: !!hotelDay });

  return useMemo(() => {
    const map = new Map<string, string>();
    for (const room of rooms) {
      if (!room.room_number) continue;
      for (const occupant of room.occupants) map.set(occupant.toLowerCase(), room.room_number);
    }
    return map;
  }, [rooms]);
}
