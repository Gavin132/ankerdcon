import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type { UpdateNameRequest, UpdatePreferencesRequest, User, LocationPingRequest } from "../types";

export async function getCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>(apiRoutes.users.me);
  return data;
}

export async function getPublicUserNames(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>(apiRoutes.users.names);
  return data;
}

export async function getUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>(apiRoutes.users.base);
  return data;
}

export async function getUser(name: string): Promise<User> {
  const { data } = await apiClient.get<User>(apiRoutes.users.byId(encodeURIComponent(name)));
  return data;
}

export async function updatePreferences(payload: UpdatePreferencesRequest): Promise<void> {
  await apiClient.put(apiRoutes.users.preferences, payload);
}

export async function updateName(payload: UpdateNameRequest): Promise<void> {
  await apiClient.patch(apiRoutes.users.name, payload);
}

export async function uploadBanner(blob: Blob, mimeType: string, position?: string): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", blob, `banner.${mimeType === "image/gif" ? "gif" : "jpg"}`);
  if (position) form.append("position", position);
  const { data } = await apiClient.post<{ url: string }>(apiRoutes.users.banner, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteBanner(): Promise<void> {
  await apiClient.delete(apiRoutes.users.banner);
}

export interface CompleteOnboardingPayload {
  pronouns?: string;
  bio?: string;
  phone_number?: string;
  color?: string;
  banner_color?: string;
  allow_dm: boolean;
  aliases?: string[];
}

export async function completeOnboarding(payload: CompleteOnboardingPayload): Promise<void> {
  await apiClient.post(apiRoutes.users.onboarding, payload);
}

export async function pingLocation(payload: LocationPingRequest): Promise<void> {
  const { user_name, zone, text } = payload;
  await apiClient.put(
    apiRoutes.users.location(encodeURIComponent(user_name)),
    { zone, text },
  );
}
