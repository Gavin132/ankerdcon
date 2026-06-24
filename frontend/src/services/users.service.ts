import { apiClient } from "../utils/api";
import type { UpdateNameRequest, UpdatePreferencesRequest, User, LocationPingRequest } from "../types";

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

export async function updateName(payload: UpdateNameRequest): Promise<void> {
  await apiClient.patch("/api/users/name", payload);
}

export async function uploadBanner(blob: Blob, mimeType: string): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", blob, `banner.${mimeType === "image/gif" ? "gif" : "jpg"}`);
  const { data } = await apiClient.post<{ url: string }>("/api/users/banner", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteBanner(): Promise<void> {
  await apiClient.delete("/api/users/banner");
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