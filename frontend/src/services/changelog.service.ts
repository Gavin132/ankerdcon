import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type { ChangelogEntry } from "../types";

export interface CreateChangelogEntryPayload {
  title: string;
  items: string[];
  released_at: string;
}

export interface UpdateChangelogEntryPayload {
  id: string;
  title?: string;
  items?: string[];
  released_at?: string;
}

// ── Public ─────────────────────────────────────────────────────────────────────

export async function getChangelog(): Promise<ChangelogEntry[]> {
  const { data } = await apiClient.get<ChangelogEntry[]>(apiRoutes.changelog.base);
  return data;
}

// ── Admin ──────────────────────────────────────────────────────────────────────

export async function getAdminChangelog(): Promise<ChangelogEntry[]> {
  const { data } = await apiClient.get<ChangelogEntry[]>(apiRoutes.admin.changelog.base);
  return data;
}

export async function createAdminChangelogEntry(payload: CreateChangelogEntryPayload): Promise<ChangelogEntry> {
  const { data } = await apiClient.post<ChangelogEntry>(apiRoutes.admin.changelog.base, payload);
  return data;
}

export async function updateAdminChangelogEntry({ id, ...payload }: UpdateChangelogEntryPayload): Promise<void> {
  await apiClient.put(apiRoutes.admin.changelog.byId(id), payload);
}

export async function deleteAdminChangelogEntry(id: string): Promise<void> {
  await apiClient.delete(apiRoutes.admin.changelog.byId(id));
}
