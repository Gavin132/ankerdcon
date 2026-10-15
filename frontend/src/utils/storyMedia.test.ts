import { describe, expect, it } from "vitest";
import { fullImage, gridImage } from "./storyMedia";

const photo = { media_type: "image" as const, image_url: "orig.jpg", poster_url: null, thumb_url: null, preview_url: null };
const video = { media_type: "video" as const, image_url: "clip.mp4", poster_url: "clip.poster.jpg", thumb_url: null, preview_url: null };

describe("gridImage", () => {
  it("uses the thumbnail when there is one", () => {
    expect(gridImage({ ...photo, thumb_url: "orig.thumb.webp" })).toBe("orig.thumb.webp");
  });

  it("falls back on the original for a photo added before thumbnails existed", () => {
    expect(gridImage(photo)).toBe("orig.jpg");
  });

  it("shows a video's still frame, never the video file", () => {
    expect(gridImage(video)).toBe("clip.poster.jpg");
    expect(gridImage({ ...video, thumb_url: "clip.thumb.webp" })).toBe("clip.thumb.webp");
    expect(gridImage({ ...video, poster_url: null })).toBe("");
  });
});

describe("fullImage", () => {
  it("uses the preview of a big photo", () => {
    expect(fullImage({ ...photo, preview_url: "orig.preview.webp" })).toBe("orig.preview.webp");
  });

  it("uses the original when it is small enough to have no preview", () => {
    expect(fullImage(photo)).toBe("orig.jpg");
  });
});
