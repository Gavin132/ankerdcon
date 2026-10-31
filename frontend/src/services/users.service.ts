import { apiClient, UPLOAD_TIMEOUT_MS } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import { supabase } from "./supabase";
import { filenameFromContentDisposition, triggerBlobDownload } from "../utils/downloadFile";
import type { UpdateNameRequest, UpdatePreferencesRequest, User, LocationPingRequest } from "../types";

export async function getCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>(apiRoutes.users.me);
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

/** Sends the member one message through the channel(s) they have set up. */
export async function sendTestNotification(): Promise<void> {
  await apiClient.post(apiRoutes.users.testNotification);
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
    timeout: UPLOAD_TIMEOUT_MS,
  });
  return data;
}

export async function deleteBanner(): Promise<void> {
  await apiClient.delete(apiRoutes.users.banner);
}

/** Custom profile picture, replacing the Discord/Google one. Already
 * square-cropped and compressed client-side (utils/imageCompression.ts). */
export async function uploadAvatar(blob: Blob): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", blob, blob.type === "image/gif" ? "avatar.gif" : "avatar.jpg");
  const { data } = await apiClient.post<{ url: string }>(apiRoutes.users.avatar, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: UPLOAD_TIMEOUT_MS,
  });
  return data;
}

export async function deleteAvatar(): Promise<void> {
  await apiClient.delete(apiRoutes.users.avatar);
}

export async function linkDiscordAccount(): Promise<User> {
  const { data } = await apiClient.post<User>(apiRoutes.users.linkDiscord);
  return data;
}

/** The ways this member can sign in (`google`, `discord`). Unlinking one is only possible while another is left. */
export async function getLoginProviders(): Promise<string[]> {
  const { data, error } = await supabase.auth.getUserIdentities();
  if (error) throw error;
  return (data?.identities ?? []).map((i) => i.provider);
}

/** Unlinks Discord from the login (the browser's own session does that, and Supabase refuses it for the last way to
 * sign in) and then lets the backend forget it on the profile. */
export async function unlinkDiscordAccount(): Promise<void> {
  const { data, error: listError } = await supabase.auth.getUserIdentities();
  if (listError) throw listError;
  const discord = data?.identities.find((i) => i.provider === "discord");
  if (discord) {
    const { error } = await supabase.auth.unlinkIdentity(discord);
    if (error) throw error;
  }
  await apiClient.delete(apiRoutes.users.discord);
}

/** Asks the admins to delete the member's account and data; every active admin is told. */
export async function requestAccountDeletion(): Promise<void> {
  await apiClient.post(apiRoutes.users.deletionRequest);
}

/** Everything the app has stored about the member, saved through the browser's normal download flow. */
export async function downloadMyData(): Promise<void> {
  const res = await apiClient.get<Blob>(apiRoutes.users.exportMe, { responseType: "blob" });
  triggerBlobDownload(res.data, filenameFromContentDisposition(res.headers["content-disposition"], "ankerd-con-mijn-gegevens.json"));
}

export interface CompleteOnboardingPayload {
  pronouns?: string;
  bio?: string;
  phone_number?: string;
  color?: string;
  banner_color?: string;
  allow_dm: boolean;
  aliases?: string[];
  notification_categories?: string[];
}

export async function completeOnboarding(payload: CompleteOnboardingPayload): Promise<void> {
  await apiClient.post(apiRoutes.users.onboarding, payload);
}

export async function pingLocation(payload: LocationPingRequest): Promise<void> {
  const { user_name, ...body } = payload;
  await apiClient.put(apiRoutes.users.location(encodeURIComponent(user_name)), body);
}
