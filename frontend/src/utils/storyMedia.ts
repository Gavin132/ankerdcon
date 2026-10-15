import type { StoryPhoto, UserStoryPhoto } from "../types";

type Media = Pick<StoryPhoto | UserStoryPhoto, "media_type" | "image_url" | "poster_url" | "thumb_url" | "preview_url">;

/**
 * Which file to show where. A photo is stored as the full-size original (up to 2560 px, easily a
 * megabyte), and the backend makes lighter copies next to it: a thumbnail for grids and a preview for the
 * story viewer. Using the original everywhere would pull megabytes of mobile data for pictures shown
 * 100 px wide, so the original is for downloading (the backend's download routes) and as the fallback for
 * what was added before the copies existed.
 */

/** Small tiles: a grid, a ring. A video shows its still frame. */
export function gridImage(m: Media): string {
  return m.thumb_url ?? m.poster_url ?? (m.media_type === "video" ? "" : m.image_url);
}

/** Full screen: the story viewer and the lightbox. The preview is only there for a photo clearly bigger
 * than it; without one the original is already small enough. A video has its own player. */
export function fullImage(m: Media): string {
  return m.preview_url ?? m.image_url;
}
