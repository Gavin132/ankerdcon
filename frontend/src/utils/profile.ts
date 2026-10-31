import type { CSSProperties } from "react";
import { parseHex, readableOn, toHex, type Rgb } from "./color";

/** The font stacks of the profile name styles ("default" is the app's own font). Shared by the profile page,
 * onboarding and the profile popup. */
export const FONT_MAP: Record<string, string> = {
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  cursive: "cursive",
  display: 'Impact, "Arial Black", sans-serif',
};

/** Name colours to pick from. Near-black and lime are left out: one vanishes on the dark theme, the other on the light. */
export const NAME_COLORS = [
  "#0ea5e9",
  "#8b5cf6",
  "#10b981",
  "#f43f5e",
  "#f59e0b",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#64748b",
];

export const BANNER_COLORS = [
  "#0f172a",
  "#1e293b",
  "#1a1a2e",
  "#2d1b69",
  "#0c4a6e",
  "#14532d",
  "#7c2d12",
  "#1c1917",
  "#0369a1",
  "#064e3b",
  "#4c0519",
  "#292524",
];

/** The banner when nobody picked a colour: the hero ink (`--hero` in index.css). */
export const HERO_COLOR = "rgb(var(--hero))";

/** The banner of a profile: the picture if there is one (cropped around `bannerPosition`), else the colour. */
export function getBannerStyle(bannerColor: string, bannerUrl?: string, bannerPosition?: string): CSSProperties {
  if (bannerUrl) {
    return { backgroundImage: `url(${bannerUrl})`, backgroundSize: "cover", backgroundPosition: bannerPosition || "center" };
  }
  if (bannerColor) return { backgroundColor: bannerColor };
  return { backgroundColor: HERO_COLOR };
}

/**
 * The page behind a name, per theme: the darker of `--paper` / `--surface` in light mode, the lighter in dark
 * mode (`src/utils/profile.test.ts` checks these against index.css). A stored name colour is only a
 * preference of its owner and the other theme can make it vanish.
 */
export const NAME_BACKDROP: { light: Rgb; dark: Rgb } = { light: [245, 248, 249], dark: [20, 27, 32] };

/**
 * A stored name colour as text on the page: unchanged when it is readable (4.5:1) in the current theme, else
 * the same hue moved lighter or darker until it is. Nothing is saved; the owner's choice stays as picked.
 * No colour (or one that is not a hex colour) gives undefined, so the text keeps `text-ink`.
 */
export function readableNameColor(color: string | null | undefined, isDark: boolean): string | undefined {
  const rgb = parseHex(color);
  if (!rgb) return undefined;
  return toHex(readableOn(rgb, isDark ? NAME_BACKDROP.dark : NAME_BACKDROP.light));
}
