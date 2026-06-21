import { apiClient } from "../utils/api";
import type { CalendarEvent } from "../types";

export async function getCalendar(): Promise<CalendarEvent[]> {
  const { data } = await apiClient.get<CalendarEvent[]>("/api/calendar/");
  return data;
}

export async function rsvpCalendarEvent(rowNumber: number, userName: string): Promise<void> {
  await apiClient.post(`/api/calendar/${rowNumber}/rsvp`, { user_name: userName });
}

export async function leaveCalendarEvent(rowNumber: number, userName: string): Promise<void> {
  await apiClient.post(`/api/calendar/${rowNumber}/leave`, { user_name: userName });
}
