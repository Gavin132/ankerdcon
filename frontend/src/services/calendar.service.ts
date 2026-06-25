import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type { CalendarEvent } from "../types";

export async function getCalendar(): Promise<CalendarEvent[]> {
  const { data } = await apiClient.get<CalendarEvent[]>(apiRoutes.calendar.base);
  return data;
}

export async function rsvpCalendarEvent(id: string, userName: string): Promise<void> {
  await apiClient.post(apiRoutes.calendar.rsvp(id), { user_name: userName });
}

export async function leaveCalendarEvent(id: string, userName: string): Promise<void> {
  await apiClient.post(apiRoutes.calendar.leave(id), { user_name: userName });
}
