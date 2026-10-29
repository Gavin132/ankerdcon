import type { CSSProperties } from "react";

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

/** The banner of a profile: the picture if there is one (cropped around `bannerPosition`), else the colour. */
export function getBannerStyle(bannerColor: string, bannerUrl?: string, bannerPosition?: string): CSSProperties {
  if (bannerUrl) {
    return { backgroundImage: `url(${bannerUrl})`, backgroundSize: "cover", backgroundPosition: bannerPosition || "center" };
  }
  if (bannerColor) return { backgroundColor: bannerColor };
  return { backgroundColor: "#0F1519" };
}
