/** Mirrors backend/app/routers/stories.py's _VIDEO_MAX_BYTES — checked here too so an oversized
 * video fails before a slow upload instead of after it. */
export const STORY_VIDEO_MAX_BYTES = 80 * 1024 * 1024;

/** From here a video is worth a warning before it goes: on mobile data or slow wifi it takes minutes
 * and may not make it. Roughly 15–20 seconds of 1080p. */
export const STORY_VIDEO_WARN_BYTES = 25 * 1024 * 1024;

const VIDEO_TYPES: Record<string, string> = { mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm" };

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/") || !!VIDEO_TYPES[file.name.split(".").pop()?.toLowerCase() ?? ""];
}

/** The file with a content type the server accepts: some Android pickers hand over a video
 * with no type at all, and the server goes by the label before it checks the bytes. */
export function withVideoType(file: File): File {
  if (file.type.startsWith("video/")) return file;
  const type = VIDEO_TYPES[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? "video/mp4";
  return new File([file], file.name, { type, lastModified: file.lastModified });
}

const POSTER_MAX_DIMENSION = 1280;
const POSTER_TIMEOUT_MS = 10_000;

/** A video that plays right here ends up as a still frame (a little way in, not the often black
 * first frame). A video this browser cannot decode (an iPhone's HEVC on a desktop without the codec)
 * still uploads: it gets a plain dark frame, and the viewers who can play it see it fine. */
export async function makeVideoPoster(file: File): Promise<Blob> {
  try {
    return await frameOf(file);
  } catch {
    return darkFrame();
  }
}

function frameOf(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const done = (fn: () => void) => {
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      fn();
    };
    const timer = setTimeout(() => done(() => reject(new Error("Video laden duurde te lang"))), POSTER_TIMEOUT_MS);

    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onerror = () => done(() => reject(new Error("Kon video niet lezen")));
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, (video.duration || 0) / 10);
    };
    video.onseeked = () => {
      const scale = Math.min(1, POSTER_MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx || !video.videoWidth) return done(() => reject(new Error("Geen beeld")));
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => done(() => (blob ? resolve(blob) : reject(new Error("Beeld maken mislukt")))),
        "image/jpeg",
        0.8,
      );
    };
    video.src = url;
  });
}

function darkFrame(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 360;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas niet beschikbaar"));
    ctx.fillStyle = "#0F1519";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Beeld maken mislukt"))), "image/jpeg", 0.8);
  });
}
