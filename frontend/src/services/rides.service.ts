import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type {
  Ride,
  CreateRideRequest,
  Direction,
  RestaurantDriverRequest,
  LeaveRestaurantDriverRequest,
  RestaurantAssignRequest,
  RestaurantUnassignRequest,
} from "../types";

export async function getRides(direction?: Direction): Promise<Ride[]> {
  const params = direction ? { direction } : {};
  const { data } = await apiClient.get<Ride[]>(apiRoutes.rides.base, { params });
  return data;
}

export async function createRide(payload: CreateRideRequest): Promise<Ride> {
  const { data } = await apiClient.post<Ride>(apiRoutes.rides.base, payload);
  return data;
}

export async function claimSeat(id: string, payload: { user_name: string }): Promise<void> {
  await apiClient.post(apiRoutes.rides.claim(id), payload);
}

export async function leaveSeat(id: string, payload: { user_name: string }): Promise<void> {
  await apiClient.post(apiRoutes.rides.leave(id), payload);
}

export async function addRestaurantDriver(id: number, payload: RestaurantDriverRequest): Promise<void> {
  await apiClient.post(apiRoutes.rides.restaurantDriver(id), payload);
}

export async function leaveRestaurantDriver(id: number, payload: LeaveRestaurantDriverRequest): Promise<void> {
  await apiClient.post(apiRoutes.rides.restaurantDriverLeave(id), payload);
}

export async function assignToDriver(id: number, payload: RestaurantAssignRequest): Promise<void> {
  await apiClient.post(apiRoutes.rides.restaurantDriverAssign(id), payload);
}

export async function unassignFromDriver(id: number, payload: RestaurantUnassignRequest): Promise<void> {
  await apiClient.post(apiRoutes.rides.restaurantDriverUnassign(id), payload);
}
