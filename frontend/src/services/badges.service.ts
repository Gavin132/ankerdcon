import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import { supabase } from "./supabase";
import type { Badge } from "../types";

const BADGE_BUCKET = "badges";
const BADGE_SIZE = 128;

/** Resize any image to a square BADGE_SIZE×BADGE_SIZE PNG using Canvas. */
function normalizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = BADGE_SIZE;
      canvas.height = BADGE_SIZE;
      const ctx = canvas.getContext("2d")!;
      // Scale to fit (contain) centered on transparent background
      const scale = Math.min(BADGE_SIZE / img.width, BADGE_SIZE / img.height);
      const x = (BADGE_SIZE - img.width * scale) / 2;
      const y = (BADGE_SIZE - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Normalisatie mislukt."))),
        "image/png",
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Afbeelding kon niet geladen worden.")); };
    img.src = url;
  });
}

export async function uploadBadgeImage(file: File): Promise<string> {
  const blob = await normalizeImage(file);
  const path = `${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage
    .from(BADGE_BUCKET)
    .upload(path, blob, { contentType: "image/png", upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BADGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export interface CreateBadgePayload {
  name: string;
  description: string;
  image_url: string;
}

export interface UpdateBadgePayload {
  id: string;
  name?: string;
  description?: string;
  image_url?: string;
}

// ── Public ─────────────────────────────────────────────────────────────────────

export async function getBadges(): Promise<Badge[]> {
  const { data } = await apiClient.get<Badge[]>(apiRoutes.badges.base);
  return data;
}

// ── Admin ──────────────────────────────────────────────────────────────────────

export async function getAdminBadges(): Promise<Badge[]> {
  const { data } = await apiClient.get<Badge[]>(apiRoutes.admin.badges.base);
  return data;
}

export async function createAdminBadge(payload: CreateBadgePayload): Promise<Badge> {
  const { data } = await apiClient.post<Badge>(apiRoutes.admin.badges.base, payload);
  return data;
}

export async function updateAdminBadge({ id, ...payload }: UpdateBadgePayload): Promise<void> {
  await apiClient.put(apiRoutes.admin.badges.byId(id), payload);
}

export async function deleteAdminBadge(id: string): Promise<void> {
  await apiClient.delete(apiRoutes.admin.badges.byId(id));
}

export async function reorderBadges(items: { id: string; display_order: number }[]): Promise<void> {
  await apiClient.patch(apiRoutes.admin.badges.reorder, items);
}

export async function assignBadgeToUser(userId: string, badgeId: string): Promise<void> {
  await apiClient.post(apiRoutes.admin.badges.assignUser(userId, badgeId));
}

export async function unassignBadgeFromUser(userId: string, badgeId: string): Promise<void> {
  await apiClient.delete(apiRoutes.admin.badges.unassignUser(userId, badgeId));
}
