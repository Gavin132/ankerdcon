import { apiClient } from "../utils/api";
import type { CalendarEvent } from "../types";

export async function getCalendar(): Promise<CalendarEvent[]> {
  const { data } = await apiClient.get<CalendarEvent[]>("/api/calendar/");
  return data;
}

export async function rsvpCalendarEvent(id: string, userName: string): Promise<void> {
  await apiClient.post(`/api/calendar/${id}/rsvp`, { user_name: userName });
}

export async function leaveCalendarEvent(id: string, userName: string): Promise<void> {
  await apiClient.post(`/api/calendar/${id}/leave`, { user_name: userName });
}
