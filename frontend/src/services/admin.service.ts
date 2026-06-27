import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type {
  AdminStats,
  CalendarEvent,
  CreateRideRequest,
  Meal,
  Ride,
  User,
} from "../types";

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await apiClient.get<AdminStats>(apiRoutes.admin.stats);
  return data;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getAdminUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>(apiRoutes.admin.users.base);
  return data;
}

export interface AdminCreateUserPayload {
  name: string;
  discord_id?: string;
  is_admin?: boolean;
}

export async function createAdminUser(payload: AdminCreateUserPayload): Promise<User> {
  const { data } = await apiClient.post<User>(apiRoutes.admin.users.base, payload);
  return data;
}

export interface AdminUpdateUserPayload {
  id: string;
  hotel_room?: string;
  phone_number?: string;
  pronouns?: string;
  bio?: string;
  color?: string;
  is_admin?: boolean;
  is_active?: boolean;
  aliases?: string[];
}

export async function updateAdminUser({ id, ...payload }: AdminUpdateUserPayload): Promise<void> {
  await apiClient.put(apiRoutes.admin.users.byId(id), payload);
}

export async function deleteAdminUser(id: string): Promise<void> {
  await apiClient.delete(apiRoutes.admin.users.byId(id));
}

// ── Rides ─────────────────────────────────────────────────────────────────────

export async function getAdminRides(): Promise<Ride[]> {
  const { data } = await apiClient.get<Ride[]>(apiRoutes.admin.rides.base);
  return data;
}

export async function createAdminRide(payload: CreateRideRequest): Promise<Ride> {
  const { data } = await apiClient.post<Ride>(apiRoutes.admin.rides.base, payload);
  return data;
}

export interface AdminUpdateRidePayload {
  id: string;
  direction?: string;
  vehicle_type?: string;
  driver?: string;
  departure_time?: string;
  start_location?: string;
  total_seats?: number;
  parking_info?: string;
  maps_link?: string;
  car_available?: boolean;
  action_required?: boolean;
}

export async function updateAdminRide({ id, ...payload }: AdminUpdateRidePayload): Promise<void> {
  await apiClient.put(apiRoutes.admin.rides.byId(id), payload);
}

export async function deleteAdminRide(id: string): Promise<void> {
  await apiClient.delete(apiRoutes.admin.rides.byId(id));
}

export async function removeAdminPassenger(rideId: string, passenger: string): Promise<void> {
  await apiClient.delete(apiRoutes.admin.rides.passenger(rideId, passenger));
}

// ── Meals ─────────────────────────────────────────────────────────────────────

export async function getAdminMeals(): Promise<Meal[]> {
  const { data } = await apiClient.get<Meal[]>(apiRoutes.admin.meals.base);
  return data;
}

export interface AdminCreateMealPayload {
  meal_name: string;
  time: string;
  location?: string;
  cost?: number;
  transport_needed?: boolean;
}

export async function createAdminMeal(payload: AdminCreateMealPayload): Promise<Meal> {
  const { data } = await apiClient.post<Meal>(apiRoutes.admin.meals.base, payload);
  return data;
}

export interface AdminUpdateMealPayload {
  id: string;
  meal_name?: string;
  time?: string;
  location?: string;
  cost?: number;
  transport_needed?: boolean;
}

export async function updateAdminMeal({ id, ...payload }: AdminUpdateMealPayload): Promise<void> {
  await apiClient.put(apiRoutes.admin.meals.byId(id), payload);
}

export async function deleteAdminMeal(id: string): Promise<void> {
  await apiClient.delete(apiRoutes.admin.meals.byId(id));
}

export async function removeAdminMealParticipant(mealId: string, participant: string): Promise<void> {
  await apiClient.delete(apiRoutes.admin.meals.participant(mealId, participant));
}

// ── Calendar Events ───────────────────────────────────────────────────────────

export async function getAdminEvents(): Promise<CalendarEvent[]> {
  const { data } = await apiClient.get<CalendarEvent[]>(apiRoutes.admin.calendar.base);
  return data;
}

export interface AdminCreateEventPayload {
  event_name: string;
  date: string;
  event_group_id?: string;
  is_hotel?: boolean;
  description?: string;
  location?: string;
  website?: string;
  ticket_url?: string;
  ticket_sale_start?: string;
  ticket_types?: { title: string; price: number }[];
  locker_info?: string;
  parking_info?: string;
  special_instructions?: string;
  what_to_bring?: string;
}

export async function createAdminEvent(payload: AdminCreateEventPayload): Promise<CalendarEvent> {
  const { data } = await apiClient.post<CalendarEvent>(apiRoutes.admin.calendar.base, payload);
  return data;
}

export interface AdminUpdateEventPayload {
  id: string;
  event_name?: string;
  date?: string;
  is_hotel?: boolean;
  description?: string;
  location?: string;
  website?: string;
  ticket_url?: string;
  ticket_sale_start?: string;
  ticket_types?: { title: string; price: number }[];
  locker_info?: string;
  parking_info?: string;
  special_instructions?: string;
  what_to_bring?: string;
}

export async function updateAdminEvent({ id, ...payload }: AdminUpdateEventPayload): Promise<void> {
  await apiClient.put(apiRoutes.admin.calendar.byId(id), payload);
}

export async function deleteAdminEvent(id: string): Promise<void> {
  await apiClient.delete(apiRoutes.admin.calendar.byId(id));
}

export async function removeAdminEventParticipant(
  eventId: string,
  participant: string,
): Promise<void> {
  await apiClient.delete(apiRoutes.admin.calendar.participant(eventId, participant));
}

export async function setAdminEventGroup(
  eventId: string,
  groupId: string | null,
): Promise<void> {
  await apiClient.patch(apiRoutes.admin.calendar.group(eventId), { group_id: groupId });
}

export async function bulkDeleteAdminEvents(eventIds: string[]): Promise<void> {
  await apiClient.post(apiRoutes.admin.calendar.bulkDelete, { event_ids: eventIds });
}

export async function bulkGroupAdminEvents(
  eventIds: string[],
  multiDayId: string | null,
): Promise<void> {
  await apiClient.post(apiRoutes.admin.calendar.bulkGroup, {
    event_ids: eventIds,
    multi_day_id: multiDayId,
  });
}

export async function bulkSetAdminEventGroup(
  eventIds: string[],
  groupId: string | null,
): Promise<void> {
  await apiClient.post(apiRoutes.admin.calendar.bulkSetGroup, {
    event_ids: eventIds,
    group_id: groupId,
  });
}

// ── Event groups ──────────────────────────────────────────────────────────────

export interface EventGroup {
  id: string;
  name: string;
  created_at: string;
}

export async function getAdminEventGroups(): Promise<EventGroup[]> {
  const { data } = await apiClient.get<EventGroup[]>(apiRoutes.admin.eventGroups.base);
  return data;
}

export async function createAdminEventGroup(name: string): Promise<EventGroup> {
  const { data } = await apiClient.post<EventGroup>(apiRoutes.admin.eventGroups.base, { name });
  return data;
}

export async function updateAdminEventGroup(id: string, name: string): Promise<void> {
  await apiClient.put(apiRoutes.admin.eventGroups.byId(id), { name });
}

export async function deleteAdminEventGroup(id: string): Promise<void> {
  await apiClient.delete(apiRoutes.admin.eventGroups.byId(id));
}
