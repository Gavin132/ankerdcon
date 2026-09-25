import { apiClient, VIDEO_UPLOAD_TIMEOUT_MS } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type {
  AdminStats,
  CdnListing,
  Event,
  EventDay,
  CreateRideRequest,
  ExpenseShare,
  Meal,
  Ride,
  User,
} from "../types";

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await apiClient.get<AdminStats>(apiRoutes.admin.stats);
  return data;
}

// ── CDN ───────────────────────────────────────────────────────────────────────

export async function getAdminCdn(params: { limit: number; offset: number; kind?: string }): Promise<CdnListing> {
  const { data } = await apiClient.get<CdnListing>(apiRoutes.admin.cdn, { params });
  return data;
}

export interface QuickUploadResult {
  url: string;
  key: string;
  media: "image" | "video";
  size: number;
}

/** Store an image or video in the bucket (admin only) and get its public URL. */
export async function quickUpload(file: File, onProgress?: (fraction: number) => void): Promise<QuickUploadResult> {
  const form = new FormData();
  form.append("file", file, file.name);
  const { data } = await apiClient.post<QuickUploadResult>(apiRoutes.admin.quickUpload, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: VIDEO_UPLOAD_TIMEOUT_MS,
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(e.loaded / e.total);
    },
  });
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

export async function bulkDeleteAdminUsers(userIds: string[]): Promise<void> {
  await apiClient.post(apiRoutes.admin.users.bulkDelete, { user_ids: userIds });
}

export async function bulkDeactivateAdminUsers(userIds: string[]): Promise<void> {
  await apiClient.post(apiRoutes.admin.users.bulkDeactivate, { user_ids: userIds });
}

export interface ImpersonateResponse {
  access_token: string;
  name: string;
}

export async function impersonateAdminUser(id: string): Promise<ImpersonateResponse> {
  const { data } = await apiClient.post<ImpersonateResponse>(apiRoutes.admin.users.impersonate(id));
  return data;
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
  end_location?: string;
  car_available?: boolean;
  action_required?: boolean;
}

export async function updateAdminRide({ id, ...payload }: AdminUpdateRidePayload): Promise<void> {
  await apiClient.put(apiRoutes.admin.rides.byId(id), payload);
}

export async function deleteAdminRide(id: string): Promise<void> {
  await apiClient.delete(apiRoutes.admin.rides.byId(id));
}

export async function bulkDeleteAdminRides(rideIds: string[]): Promise<void> {
  await apiClient.post(apiRoutes.admin.rides.bulkDelete, { ride_ids: rideIds });
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

export async function bulkDeleteAdminMeals(mealIds: string[]): Promise<void> {
  await apiClient.post(apiRoutes.admin.meals.bulkDelete, { meal_ids: mealIds });
}

export async function removeAdminMealParticipant(mealId: string, participant: string): Promise<void> {
  await apiClient.delete(apiRoutes.admin.meals.participant(mealId, participant));
}

// ── Events ────────────────────────────────────────────────────────────────────
// One `Event` row per trip/convention owning every shared field; one
// `EventDay` per day of that trip owning only the date, whether there's a
// con happening, and RSVP.

export async function getAdminEvents(): Promise<Event[]> {
  const { data } = await apiClient.get<Event[]>(apiRoutes.admin.events.base);
  return data;
}

export async function getAdminEventDays(): Promise<EventDay[]> {
  const { data } = await apiClient.get<EventDay[]>(apiRoutes.admin.events.allDays);
  return data;
}

export interface AdminCreateEventPayload {
  event_name: string;
  event_group_id?: string | null;
  is_hotel?: boolean;
  is_party?: boolean;
  hotel_location?: string | null;
  hotel_info?: string | null;
  image_url?: string | null;
  description?: string | null;
  location?: string | null;
  website?: string | null;
  ticket_url?: string | null;
  ticket_sale_start?: string | null;
  ticket_types?: { title: string; price: number }[];
  locker_info?: string | null;
  parking_info?: string | null;
  special_instructions?: string | null;
  what_to_bring?: string | null;
}

export async function createAdminEvent(payload: AdminCreateEventPayload): Promise<Event> {
  const { data } = await apiClient.post<Event>(apiRoutes.admin.events.base, payload);
  return data;
}

export interface AdminUpdateEventPayload extends Partial<AdminCreateEventPayload> {
  id: string;
}

export async function updateAdminEvent({ id, ...payload }: AdminUpdateEventPayload): Promise<void> {
  await apiClient.put(apiRoutes.admin.events.byId(id), payload);
}

export async function deleteAdminEvent(id: string): Promise<void> {
  await apiClient.delete(apiRoutes.admin.events.byId(id));
}

export async function bulkDeleteAdminEvents(eventIds: string[]): Promise<void> {
  await apiClient.post(apiRoutes.admin.events.bulkDelete, { event_ids: eventIds });
}

export async function bulkSetAdminEventGroup(
  eventIds: string[],
  groupId: string | null,
): Promise<void> {
  await apiClient.post(apiRoutes.admin.events.bulkSetGroup, {
    event_ids: eventIds,
    group_id: groupId,
  });
}

export interface AdminCreateEventDayPayload {
  date: string;
  has_con?: boolean;
}

export async function createAdminEventDay(
  eventId: string,
  payload: AdminCreateEventDayPayload,
): Promise<EventDay> {
  const { data } = await apiClient.post<EventDay>(apiRoutes.admin.events.days(eventId), payload);
  return data;
}

export async function updateAdminEventDay(
  dayId: string,
  payload: { date?: string; has_con?: boolean },
): Promise<void> {
  await apiClient.put(apiRoutes.admin.events.dayById(dayId), payload);
}

export async function deleteAdminEventDay(dayId: string): Promise<void> {
  await apiClient.delete(apiRoutes.admin.events.dayById(dayId));
}

export async function removeAdminEventParticipant(
  dayId: string,
  participant: string,
): Promise<void> {
  await apiClient.delete(apiRoutes.admin.events.dayParticipant(dayId, participant));
}

export async function bulkRsvpAdminEvent(
  dayId: string,
  userNames: string[],
): Promise<void> {
  await apiClient.post(apiRoutes.admin.events.dayBulkRsvp(dayId), { user_names: userNames });
}

// ── Hotel Rooms (admin) ───────────────────────────────────────────────────────

export interface AdminUpdateHotelRoomPayload {
  room_number?: string;
  floor?: string;
  instructions?: string;
  capacity?: number;
  occupants?: string[];
}

export async function adminUpdateHotelRoom(
  eventId: string,
  roomId: string,
  payload: AdminUpdateHotelRoomPayload,
): Promise<void> {
  await apiClient.put(apiRoutes.admin.events.hotelRoomById(eventId, roomId), payload);
}

export async function adminDeleteHotelRoom(eventId: string, roomId: string): Promise<void> {
  await apiClient.delete(apiRoutes.admin.events.hotelRoomById(eventId, roomId));
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

export async function bulkDeleteAdminEventGroups(groupIds: string[]): Promise<void> {
  await apiClient.post(apiRoutes.admin.eventGroups.bulkDelete, { group_ids: groupIds });
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function updateAdminExpense(id: string, linkedEventId: string | null): Promise<void> {
  await apiClient.put(apiRoutes.admin.expenses.byId(id), { linked_event_id: linkedEventId });
}

export async function deleteAdminExpense(id: string): Promise<void> {
  await apiClient.delete(apiRoutes.admin.expenses.byId(id));
}

export async function setAdminShareStatus(shareId: string, status: ExpenseShare["status"]): Promise<void> {
  await apiClient.put(apiRoutes.admin.expenseShares.byId(shareId), { status });
}
