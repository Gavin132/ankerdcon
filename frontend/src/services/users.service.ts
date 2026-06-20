import { apiClient } from "../utils/api";
import type { User, LocationPingRequest } from "../types";

export async function getUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>("/api/users/");
  return data;
}

export async function pingLocation(
  payload: LocationPingRequest,
): Promise<void> {
  const { user_name, zone, text } = payload;
  await apiClient.put(
    `/api/users/${encodeURIComponent(user_name)}/location`,
    { zone, text },
  );
}
