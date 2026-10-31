import { create } from "zustand";

const STORAGE_KEY = "ankerd-data-saver";

interface DataSaverState {
  /** Spares mobile data: the story viewer loads nothing ahead and a video only when it is tapped. */
  on: boolean;
  toggle: () => void;
}

function initial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

/** A choice for this device, not for the member: it depends on the connection that device is on, so it is kept in
 * the browser like the theme and not on the profile. */
export const useDataSaverStore = create<DataSaverState>((set, get) => ({
  on: initial(),
  toggle: () => {
    const on = !get().on;
    try {
      localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
    } catch {}
    set({ on });
  },
}));
