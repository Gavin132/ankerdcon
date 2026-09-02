import { create } from "zustand";

const WIDGET_ENABLED_KEY = "ankerd-timetravel-widget-enabled";

function loadWidgetEnabled(): boolean {
  try {
    const raw = localStorage.getItem(WIDGET_ENABLED_KEY);
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}

interface TimeState {
  override: Date | null;
  setOverride: (d: Date | null) => void;
  /** Whether the floating time-travel button should render at all — toggled
   *  from Admin > Testen, persisted so it stays hidden across reloads. */
  widgetEnabled: boolean;
  setWidgetEnabled: (v: boolean) => void;
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
  widgetEnabled: loadWidgetEnabled(),
  setWidgetEnabled: (v) => {
    try {
      localStorage.setItem(WIDGET_ENABLED_KEY, String(v));
    } catch {}
    set({ widgetEnabled: v });
  },
}));

export function getNow(): Date {
  return useTimeStore.getState().override ?? new Date();
}
