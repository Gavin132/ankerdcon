import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type { Cosplay, CreateCosplayRequest } from "../types";

export async function getCosplays(): Promise<Cosplay[]> {
  const { data } = await apiClient.get<Cosplay[]>(apiRoutes.cosplays.base);
  return data;
}

export async function createCosplay(payload: CreateCosplayRequest): Promise<Cosplay> {
  const { data } = await apiClient.post<Cosplay>(apiRoutes.cosplays.base, payload);
  return data;
}

export async function deleteCosplay(id: string): Promise<void> {
  await apiClient.delete(apiRoutes.cosplays.byId(id));
}

/** Upload an inspiration image for a cosplay — stored the same way as event-day story photos. */
export async function uploadCosplayImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<{ url: string }>(apiRoutes.cosplays.image, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.url;
}
