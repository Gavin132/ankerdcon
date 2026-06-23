import { apiClient } from "../utils/api";
import type { UpdatePreferencesRequest, User, LocationPingRequest } from "../types";

export async function getPublicUserNames(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>("/api/users/names");
  return data;
}

// ─── The missing function for the Hub & Transport pages! ───
export async function getUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>("/api/users/");
  return data;
}

// ─── The secure single-user fetch we added for the Profile! ───
export async function getUser(name: string): Promise<User> {
  const { data } = await apiClient.get<User>(`/api/users/${encodeURIComponent(name)}`);
  return data;
}

export async function updatePreferences(
  payload: UpdatePreferencesRequest,
): Promise<void> {
  await apiClient.put("/api/users/preferences", payload);
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