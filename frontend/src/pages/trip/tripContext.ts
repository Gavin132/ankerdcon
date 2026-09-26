import { useOutletContext } from "react-router-dom";
import type { Trip, TripTabId } from "../../utils/trips";

export interface TripOutletContext {
  trip: Trip;
  /** The day picked with the day chips, or null for "Alle dagen". */
  dayId: string | null;
  setDayId: (dayId: string | null) => void;
  /** The URL's tab segment — Overzicht is the only real page now; the rest open as sheets on top of it. */
  activeTab: TripTabId;
}

/** The trip every `/trips/:tripId/*` tab renders for — provided by TripLayout. */
export function useTrip(): TripOutletContext {
  return useOutletContext<TripOutletContext>();
}

const LAST_TAB_KEY = "ankerd-last-trip-tab";

/** The Event tab reopens the sub-tab used last, so e.g. Vervoer stays one tap away. */
export function rememberTripTab(tab: TripTabId) {
  try {
    localStorage.setItem(LAST_TAB_KEY, tab);
  } catch {
    // storage unavailable (private mode) — just open on Overzicht next time
  }
}

export function lastTripTab(): string | null {
  try {
    return localStorage.getItem(LAST_TAB_KEY);
  } catch {
    return null;
  }
}
