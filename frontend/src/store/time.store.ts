import { create } from "zustand";

interface TimeState {
  override: Date | null;
  setOverride: (d: Date | null) => void;
}

/**
 * Admin-only "time travel" override for testing time-dependent features
 * (quick-ride direction guessing, ride/event day grouping, past-item
 * filtering) without waiting for the real clock. The override is a frozen
 * point in time, not a running clock offset — it stays put until changed
 * or reset. Lives only in memory, so a refresh clears it.
 *
 * `getNow()` is safe to call from plain utility functions outside React.
 * Components that need to re-render when the override changes should
 * subscribe via `useTimeStore((s) => s.override)`.
 */
export const useTimeStore = create<TimeState>((set) => ({
  override: null,
  setOverride: (d) => set({ override: d }),
}));

export function getNow(): Date {
  return useTimeStore.getState().override ?? new Date();
}
