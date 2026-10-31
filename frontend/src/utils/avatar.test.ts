import { describe, expect, it } from "vitest";
import { avatarPx, avatarSrc } from "./avatar";

describe("avatarPx", () => {
  it("reads the size from the Tailwind height class", () => {
    expect(avatarPx("h-6 w-6 text-[9px]")).toBe(24);
    expect(avatarPx("flex h-8 w-8 shrink-0")).toBe(32);
    expect(avatarPx("h-[18px] w-[18px]")).toBe(18);
    expect(avatarPx("h-1.5 w-1.5")).toBe(6);
  });

  it("falls back when the class names no height", () => {
    expect(avatarPx("rounded-full")).toBe(40);
    expect(avatarPx("rounded-full", 64)).toBe(64);
  });

  it("does not take a responsive or partial class for the height", () => {
    expect(avatarPx("sm:h-12 h-6")).toBe(24);
    expect(avatarPx("min-h-10")).toBe(40);
  });
});

describe("avatarSrc", () => {
  it("asks Discord for the size it needs", () => {
    expect(avatarSrc("https://cdn.discordapp.com/avatars/123/abc.png", 24)).toBe("https://cdn.discordapp.com/avatars/123/abc.png?size=128");
    expect(avatarSrc("https://cdn.discordapp.com/avatars/123/abc.png?size=1024", 40)).toBe("https://cdn.discordapp.com/avatars/123/abc.png?size=128");
    expect(avatarSrc("https://cdn.discordapp.com/avatars/123/abc.png", 112)).toBe("https://cdn.discordapp.com/avatars/123/abc.png?size=256");
  });

  it("never asks for less than 64 or more than 256 pixels", () => {
    expect(avatarSrc("https://cdn.discordapp.com/avatars/1/a.png", 8)).toContain("size=64");
    expect(avatarSrc("https://cdn.discordapp.com/avatars/1/a.png", 400)).toContain("size=256");
  });

  it("asks Google for the size it needs", () => {
    expect(avatarSrc("https://lh3.googleusercontent.com/a/ID=s96-c", 24)).toBe("https://lh3.googleusercontent.com/a/ID=s128-c");
  });

  it("leaves any other address alone", () => {
    expect(avatarSrc("https://cdn.example.com/story-photos/avatars/u/x.jpg", 24)).toBe("https://cdn.example.com/story-photos/avatars/u/x.jpg");
    expect(avatarSrc("/relative.png", 24)).toBe("/relative.png");
    expect(avatarSrc("https://cdn.discordapp.com/banners/1/b.png", 24)).toBe("https://cdn.discordapp.com/banners/1/b.png");
  });
});
