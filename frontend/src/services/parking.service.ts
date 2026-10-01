import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type { ParkingSpot, SetParkingSpotRequest } from "../types";

export async function getParkingSpots(tripId: string): Promise<ParkingSpot[]> {
  const { data } = await apiClient.get<ParkingSpot[]>(apiRoutes.parking.byTrip(tripId));
  return data;
}

export async function setParkingSpot(tripId: string, payload: SetParkingSpotRequest): Promise<ParkingSpot> {
  const { data } = await apiClient.post<ParkingSpot>(apiRoutes.parking.byTrip(tripId), payload);
  return data;
}

export async function deleteParkingSpot(tripId: string, driver: string): Promise<void> {
  await apiClient.delete(apiRoutes.parking.detail(tripId, driver));
}
