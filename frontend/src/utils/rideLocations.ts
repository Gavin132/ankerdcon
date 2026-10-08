import type { Direction } from "../types";

export interface RideEndsInput {
  /** Inbound is to the event, Outbound is away from it. Anything else gets nothing filled in. */
  direction: Direction;
  /** Which day of the trip the ride is on (0 = first); -1 when it is not on a day of the trip. */
  dayIndex: number;
  dayCount: number;
  /** The event's own location (the con, the venue). */
  venue: string;
  /** The hotel's address; empty when the trip has none. */
  hotel: string;
  isHotel: boolean;
}

/**
 * Where a new ride starts and ends, as far as the trip can tell. The event side is the
 * venue. The other side is the hotel when the member sleeps there that night, and is
 * left empty (home, wherever from) otherwise:
 *
 * - Heen on the first day comes from home; on any later day it comes from the hotel,
 *   where the night before was spent.
 * - Terug on the last day goes home; on any earlier day it goes back to the hotel.
 *
 * Only a starting point: the member can still change either end.
 */
export function defaultRideEnds({ direction, dayIndex, dayCount, venue, hotel, isHotel }: RideEndsInput): { start: string; end: string } {
  const hotelHere = isHotel && !!hotel && dayIndex >= 0;
  if (direction === "Inbound") {
    return { start: hotelHere && dayIndex > 0 ? hotel : "", end: venue };
  }
  if (direction === "Outbound") {
    return { start: venue, end: hotelHere && dayIndex < dayCount - 1 ? hotel : "" };
  }
  return { start: "", end: "" };
}
