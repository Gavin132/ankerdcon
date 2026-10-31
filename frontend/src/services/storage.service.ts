import { apiClient, UPLOAD_TIMEOUT_MS } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import { compressImage } from "../utils/imageCompression";

/** The server keeps a cover at 1600 px on its long side anyway, so a bigger picture only makes the upload slower. */
const COVER_MAX_SIDE = 1600;
/** Under this a picture is sent as it is. */
const COVER_SKIP_BELOW_BYTES = 400_000;

/** Upload an event cover image (admins only) and return its public URL. */
export async function uploadEventCoverImage(file: File): Promise<string> {
  // A phone photo of 3 MB becomes a few hundred KB here, which is what makes the upload fast on a slow connection. Not for a PNG
  // (it may be transparent, and a canvas export would turn that black) or a GIF; and the original goes if this browser cannot
  // read the picture.
  let body: Blob = file;
  let name = file.name;
  if ((file.type === "image/jpeg" || file.type === "image/webp") && file.size > COVER_SKIP_BELOW_BYTES) {
    try {
      body = await compressImage(file, COVER_MAX_SIDE, 0.85);
      name = name.replace(/\.[^.]+$/, "") + ".jpg";
    } catch {
      body = file;
    }
  }
  const form = new FormData();
  form.append("file", body, name);
  const { data } = await apiClient.post<{ url: string }>(apiRoutes.admin.uploadImage("event-cover"), form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: UPLOAD_TIMEOUT_MS,
  });
  return data.url;
}
