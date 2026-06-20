import { apiClient } from "../utils/api";
import type { CalendarEvent } from "../types";

export async function getCalendar(): Promise<CalendarEvent[]> {
  const { data } = await apiClient.get<CalendarEvent[]>("/api/calendar/");
  return data;
}
