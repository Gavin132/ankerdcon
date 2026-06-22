import type { RestaurantDriver } from "../types";

export type RideStatus = "upcoming" | "soon" | "urgent" | "recent" | "past";

export function getRideStatus(departureTime: string): {
  status: RideStatus;
  minutesUntil: number;
} {
  const dep = new Date(departureTime.replace(" ", "T")).getTime();
  if (isNaN(dep)) return { status: "upcoming", minutesUntil: Infinity };
  const minutesUntil = (dep - Date.now()) / 60000;
  if (minutesUntil > 120) return { status: "upcoming", minutesUntil };
  if (minutesUntil > 30) return { status: "soon", minutesUntil };
  if (minutesUntil > 0) return { status: "urgent", minutesUntil };
  if (minutesUntil > -120) return { status: "recent", minutesUntil };
  return { status: "past", minutesUntil };
}

export function formatCountdown(minutes: number): string {
  const m = Math.ceil(minutes);
  if (m >= 60) return `${Math.floor(m / 60)}u ${m % 60}m`;
  return `${m}m`;
}

export function parseRestaurantDrivers(
  parkingInfo: string,
): RestaurantDriver[] {
  if (!parkingInfo || parkingInfo.trim() === "") return [];
  try {
    const parsed = JSON.parse(parkingInfo);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((d) => typeof d.name === "string" && typeof d.seats === "number")
      .map((d) => ({
        ...d,
        passengers: Array.isArray(d.passengers) ? d.passengers : [],
      }));
  } catch {
    return [];
  }
}
