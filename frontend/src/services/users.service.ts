import axios from "axios";
import { apiClient } from "../utils/api";
import type { UpdatePreferencesRequest, User, LocationPingRequest } from "../types";

export async function getPublicUserNames(): Promise<string[]> {
  const { data } = await axios.get<string[]>("/api/users/names");
  return data;
}

export async function getUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>("/api/users/");
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
