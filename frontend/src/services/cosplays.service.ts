import { apiClient, UPLOAD_TIMEOUT_MS } from "../lib/api/client";
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

/** Upload an inspiration image for a cosplay — stored the same way as event-day story photos. Takes the already-compressed blob, not the raw file. */
export async function uploadCosplayImage(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("file", blob, "cosplay.jpg");
  const { data } = await apiClient.post<{ url: string }>(apiRoutes.cosplays.image, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: UPLOAD_TIMEOUT_MS,
  });
  return data.url;
}
