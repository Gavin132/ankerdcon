import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type { Announcement, AnnouncementSeverity } from "../types";

export interface CreateAnnouncementPayload {
  message: string;
  severity: AnnouncementSeverity;
  dismissible: boolean;
  notify_discord: boolean;
}

export interface UpdateAnnouncementPayload {
  id: string;
  message?: string;
  severity?: AnnouncementSeverity;
  active?: boolean;
  dismissible?: boolean;
  notify_discord?: boolean;
}

// ── Public ─────────────────────────────────────────────────────────────────────

export async function getActiveAnnouncements(): Promise<Announcement[]> {
  const { data } = await apiClient.get<Announcement[]>(apiRoutes.announcements.active);
  return data;
}

// ── Admin ──────────────────────────────────────────────────────────────────────

export async function getAdminAnnouncements(): Promise<Announcement[]> {
  const { data } = await apiClient.get<Announcement[]>(apiRoutes.admin.announcements.base);
  return data;
}

export async function createAdminAnnouncement(payload: CreateAnnouncementPayload): Promise<Announcement> {
  const { data } = await apiClient.post<Announcement>(apiRoutes.admin.announcements.base, payload);
  return data;
}

export async function updateAdminAnnouncement({ id, ...payload }: UpdateAnnouncementPayload): Promise<void> {
  await apiClient.put(apiRoutes.admin.announcements.byId(id), payload);
}

export async function deleteAdminAnnouncement(id: string): Promise<void> {
  await apiClient.delete(apiRoutes.admin.announcements.byId(id));
}
