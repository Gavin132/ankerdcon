import { supabase } from "./supabase";

const EVENT_COVERS_BUCKET = "event-covers";

/** Upload an event cover image to Supabase Storage and return the public URL. */
export async function uploadEventCoverImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(EVENT_COVERS_BUCKET)
    .upload(path, file, { contentType: file.type });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(EVENT_COVERS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
