import { create } from "zustand";

const STORAGE_KEY = "ankerd-theme";

function getInitialDark(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === "dark";
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

interface ThemeStore {
  isDark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  isDark: getInitialDark(),
  toggle: () =>
    set((s) => {
      const next = !s.isDark;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
      } catch {}
      return { isDark: next };
    }),
}));
