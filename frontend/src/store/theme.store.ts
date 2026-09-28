import { create } from "zustand";

const STORAGE_KEY = "ankerd-theme";
const ACCENT_KEY = "ankerd-accent";
const DENSITY_KEY = "ankerd-density";

export type Density = "comfortable" | "compact";

/** The accent colour choices under Instellingen. `blue` is the default and sets no
 * attribute; the others are the `[data-accent]` blocks in index.css (keep in sync).
 * `swatch` is only what the picker shows. */
export const ACCENTS = [
  { id: "blue", label: "Blauw", swatch: "#57B2F9" },
  { id: "teal", label: "Turquoise", swatch: "#2DD4BF" },
  { id: "green", label: "Groen", swatch: "#4FC38A" },
  { id: "gold", label: "Goud", swatch: "#FACC15" },
  { id: "orange", label: "Oranje", swatch: "#FB923C" },
  { id: "pink", label: "Roze", swatch: "#F472B6" },
  { id: "purple", label: "Paars", swatch: "#A78BFA" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

function isAccent(value: string | null): value is AccentId {
  return ACCENTS.some((a) => a.id === value);
}

function getInitialDark(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === "dark";
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getInitialAccent(): AccentId {
  try {
    const stored = localStorage.getItem(ACCENT_KEY);
    if (isAccent(stored)) return stored;
  } catch {}
  return "blue";
}

function applyAccent(accent: AccentId) {
  if (accent === "blue") document.documentElement.removeAttribute("data-accent");
  else document.documentElement.setAttribute("data-accent", accent);
}

function getInitialDensity(): Density {
  try {
    const stored = localStorage.getItem(DENSITY_KEY);
    if (stored === "compact") return "compact";
  } catch {}
  return "comfortable";
}

// The `.density-compact` rules in index.css tighten gap/space-y/padding by
// overriding Tailwind's own generated classes at higher specificity, rather
// than every card/list/tile component branching on this — see the comment
// there before touching either side of that split.
function applyDensity(density: Density) {
  document.documentElement.classList.toggle("density-compact", density === "compact");
}

interface ThemeStore {
  isDark: boolean;
  /** Per device, like the dark/light choice. */
  accent: AccentId;
  density: Density;
  toggle: () => void;
  setAccent: (accent: AccentId) => void;
  setDensity: (density: Density) => void;
}

const initialAccent = getInitialAccent();
const initialDensity = getInitialDensity();
// Before the first render, so the page never shows the default for a beat.
applyAccent(initialAccent);
applyDensity(initialDensity);

export const useThemeStore = create<ThemeStore>((set) => ({
  isDark: getInitialDark(),
  accent: initialAccent,
  density: initialDensity,
  toggle: () =>
    set((s) => {
      const next = !s.isDark;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
      } catch {}
      return { isDark: next };
    }),
  setAccent: (accent) => {
    applyAccent(accent);
    try {
      if (accent === "blue") localStorage.removeItem(ACCENT_KEY);
      else localStorage.setItem(ACCENT_KEY, accent);
    } catch {}
    set({ accent });
  },
  setDensity: (density) => {
    applyDensity(density);
    try {
      if (density === "comfortable") localStorage.removeItem(DENSITY_KEY);
      else localStorage.setItem(DENSITY_KEY, density);
    } catch {}
    set({ density });
  },
}));
