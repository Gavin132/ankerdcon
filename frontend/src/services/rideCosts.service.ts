import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type { RideCostOverview } from "../types";

export async function getRideCosts(): Promise<RideCostOverview> {
  const { data } = await apiClient.get<RideCostOverview>(apiRoutes.rideCosts.base);
  return data;
}

/** What the trip cost the driver, all in one (fuel, tolls, parking). Null for none. */
export async function setRideCost(tripId: string, amount: number | null): Promise<void> {
  await apiClient.put(apiRoutes.rideCosts.trip(tripId), { amount });
}
