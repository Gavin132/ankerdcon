import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";

/** Upload an event cover image (admins only) and return its public URL. */
export async function uploadEventCoverImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file, file.name);
  const { data } = await apiClient.post<{ url: string }>(apiRoutes.admin.uploadImage("event-cover"), form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.url;
}
