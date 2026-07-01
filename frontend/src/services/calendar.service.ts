import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type { CalendarEvent, CreateHotelRoomRequest, HotelRoom } from "../types";

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

export async function getHotelRooms(eventId: string): Promise<HotelRoom[]> {
  const { data } = await apiClient.get<HotelRoom[]>(apiRoutes.calendar.hotelRooms(eventId));
  return data;
}

export async function createHotelRoom(eventId: string, payload: CreateHotelRoomRequest): Promise<HotelRoom> {
  const { data } = await apiClient.post<HotelRoom>(apiRoutes.calendar.hotelRooms(eventId), payload);
  return data;
}

export async function assignHotelRoom(eventId: string, roomId: string, userNames: string[]): Promise<void> {
  await apiClient.post(apiRoutes.calendar.assignRoom(eventId, roomId), { user_names: userNames });
}

export async function leaveHotelRoom(eventId: string, roomId: string, userName: string): Promise<void> {
  await apiClient.post(apiRoutes.calendar.leaveRoom(eventId, roomId), { user_name: userName });
}
