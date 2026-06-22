import { apiClient } from "../utils/api";
import type {
  Ride,
  CreateRideRequest,
  ClaimSeatRequest,
  Direction,
  RestaurantDriverRequest,
  LeaveRestaurantDriverRequest,
  RestaurantAssignRequest,
  RestaurantUnassignRequest,
} from "../types";

export async function getRides(direction?: Direction): Promise<Ride[]> {
  const params = direction ? { direction } : {};
  const { data } = await apiClient.get<Ride[]>("/api/rides/", { params });
  return data;
}

export async function createRide(payload: CreateRideRequest): Promise<Ride> {
  const { data } = await apiClient.post<Ride>("/api/rides/", payload);
  return data;
}

export async function claimSeat(
  rowNumber: number,
  payload: ClaimSeatRequest,
): Promise<Ride> {
  const { data } = await apiClient.post<Ride>(
    `/api/rides/${rowNumber}/claim`,
    payload,
  );
  return data;
}

export async function leaveSeat(
  rowNumber: number,
  payload: ClaimSeatRequest,
): Promise<Ride> {
  const { data } = await apiClient.post<Ride>(
    `/api/rides/${rowNumber}/leave`,
    payload,
  );
  return data;
}

export async function addRestaurantDriver(
  rowNumber: number,
  payload: RestaurantDriverRequest,
): Promise<void> {
  await apiClient.post(`/api/rides/${rowNumber}/restaurant-driver`, payload);
}

export async function leaveRestaurantDriver(
  rowNumber: number,
  payload: LeaveRestaurantDriverRequest,
): Promise<void> {
  await apiClient.post(`/api/rides/${rowNumber}/restaurant-driver/leave`, payload);
}

export async function assignToDriver(
  rowNumber: number,
  payload: RestaurantAssignRequest,
): Promise<void> {
  await apiClient.post(`/api/rides/${rowNumber}/restaurant-driver/assign`, payload);
}

export async function unassignFromDriver(
  rowNumber: number,
  payload: RestaurantUnassignRequest,
): Promise<void> {
  await apiClient.post(`/api/rides/${rowNumber}/restaurant-driver/unassign`, payload);
}
