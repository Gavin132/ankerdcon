import { apiClient } from "../utils/api";
import type {
  Ride,
  CreateRideRequest,
  Direction,
  RestaurantDriverRequest,
  LeaveRestaurantDriverRequest,
  RestaurantAssignRequest,
  RestaurantUnassignRequest,
} from "../types";
import { api } from "./api";

export async function getRides(direction?: Direction): Promise<Ride[]> {
  const params = direction ? { direction } : {};
  const { data } = await apiClient.get<Ride[]>("/api/rides/", { params });
  return data;
}

export async function createRide(payload: CreateRideRequest): Promise<Ride> {
  const { data } = await apiClient.post<Ride>("/api/rides/", payload);
  return data;
}

export const claimSeat = async (id: string, payload: { user_name: string }) => {
  await api.post(`/api/rides/${id}/claim`, payload);
};

export const leaveSeat = async (id: string, payload: { user_name: string }) => {
  await api.post(`/rides/${id}/leave`, payload);
};

export async function addRestaurantDriver(
  id: number,
  payload: RestaurantDriverRequest,
): Promise<void> {
  await apiClient.post(`/api/rides/${id}/restaurant-driver`, payload);
}

export async function leaveRestaurantDriver(
  id: number,
  payload: LeaveRestaurantDriverRequest,
): Promise<void> {
  await apiClient.post(`/api/rides/${id}/restaurant-driver/leave`, payload);
}

export async function assignToDriver(
  id: number,
  payload: RestaurantAssignRequest,
): Promise<void> {
  await apiClient.post(`/api/rides/${id}/restaurant-driver/assign`, payload);
}

export async function unassignFromDriver(
  id: number,
  payload: RestaurantUnassignRequest,
): Promise<void> {
  await apiClient.post(`/api/rides/${id}/restaurant-driver/unassign`, payload);
}
