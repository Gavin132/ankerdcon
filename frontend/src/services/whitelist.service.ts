import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type { WhitelistEntry } from "../types";

export interface CreateWhitelistEntryPayload {
  discord_id?: string;
  email?: string;
}

export async function getAdminWhitelist(): Promise<WhitelistEntry[]> {
  const { data } = await apiClient.get<WhitelistEntry[]>(apiRoutes.admin.whitelist.base);
  return data;
}

export async function createAdminWhitelistEntry(payload: CreateWhitelistEntryPayload): Promise<WhitelistEntry> {
  const { data } = await apiClient.post<WhitelistEntry>(apiRoutes.admin.whitelist.base, payload);
  return data;
}

export async function deleteAdminWhitelistEntry(id: string): Promise<void> {
  await apiClient.delete(apiRoutes.admin.whitelist.byId(id));
}
