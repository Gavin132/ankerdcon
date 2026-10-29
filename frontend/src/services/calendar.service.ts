import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type {
  BulkCreateHotelRoomsRequest,
  CalendarEvent,
  CreateHotelRoomRequest,
  HotelRoom,
  HotelRoomCreated,
  HotelRoomMoves,
  UpdateHotelRoomRequest,
} from "../types";

export async function getCalendar(): Promise<CalendarEvent[]> {
  const { data } = await apiClient.get<CalendarEvent[]>(apiRoutes.calendar.base);
  return data;
}

/** Path of the calendar subscription feed, including its secret token. */
export async function getCalendarFeedPath(): Promise<string> {
  const { data } = await apiClient.get<{ path: string }>(apiRoutes.calendar.feedUrl);
  return data.path;
}

export async function rsvpCalendarEvent(id: string, userName: string): Promise<void> {
  await apiClient.post(apiRoutes.calendar.rsvp(id), { user_name: userName });
}

export async function leaveCalendarEvent(id: string, userName: string): Promise<void> {
  await apiClient.post(apiRoutes.calendar.leave(id), { user_name: userName });
}

/** Sign several people up for one day at once — one request instead of one per person. */
export async function rsvpCalendarEventBulk(id: string, userNames: string[]): Promise<void> {
  await apiClient.post(apiRoutes.calendar.rsvpBulk(id), { user_names: userNames });
}

export async function leaveCalendarEventBulk(id: string, userNames: string[]): Promise<void> {
  await apiClient.post(apiRoutes.calendar.leaveBulk(id), { user_names: userNames });
}

export async function getHotelRooms(eventId: string): Promise<HotelRoom[]> {
  const { data } = await apiClient.get<HotelRoom[]>(apiRoutes.calendar.hotelRooms(eventId));
  return data;
}

/** A new room with people in it moves them out of their other rooms: `moved` says who. */
export async function createHotelRoom(eventId: string, payload: CreateHotelRoomRequest): Promise<HotelRoomCreated> {
  const { data } = await apiClient.post<HotelRoomCreated>(apiRoutes.calendar.hotelRooms(eventId), payload);
  return data;
}

export async function updateHotelRoom(eventId: string, roomId: string, payload: UpdateHotelRoomRequest): Promise<HotelRoomMoves> {
  const { data } = await apiClient.put<HotelRoomMoves>(apiRoutes.calendar.hotelRoom(eventId, roomId), payload);
  return { moved: data?.moved ?? [] };
}

export async function bulkCreateHotelRooms(eventId: string, payload: BulkCreateHotelRoomsRequest): Promise<HotelRoom[]> {
  const { data } = await apiClient.post<HotelRoom[]>(apiRoutes.calendar.hotelRoomsBulk(eventId), payload);
  return data;
}

export async function assignHotelRoom(eventId: string, roomId: string, userNames: string[]): Promise<HotelRoomMoves> {
  const { data } = await apiClient.post<HotelRoomMoves>(apiRoutes.calendar.assignRoom(eventId, roomId), { user_names: userNames });
  return { moved: data?.moved ?? [] };
}

export async function leaveHotelRoom(eventId: string, roomId: string, userName: string): Promise<void> {
  await apiClient.post(apiRoutes.calendar.leaveRoom(eventId, roomId), { user_name: userName });
}
