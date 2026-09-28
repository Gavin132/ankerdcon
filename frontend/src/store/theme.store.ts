import { create } from "zustand";

const STORAGE_KEY = "ankerd-theme";
const ACCENT_KEY = "ankerd-accent";

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

interface ThemeStore {
  isDark: boolean;
  /** Per device, like the dark/light choice. */
  accent: AccentId;
  toggle: () => void;
  setAccent: (accent: AccentId) => void;
}

const initialAccent = getInitialAccent();
// Before the first render, so the page never shows the default blue first.
applyAccent(initialAccent);

export const useThemeStore = create<ThemeStore>((set) => ({
  isDark: getInitialDark(),
  accent: initialAccent,
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
}));
