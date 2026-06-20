import { apiClient } from "../utils/api";
import type {
  Ride,
  CreateRideRequest,
  ClaimSeatRequest,
  Direction,
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
