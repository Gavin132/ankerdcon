import { create } from "zustand";
import {
  addPendingStoryPhoto,
  removePendingStoryPhoto,
  listPendingStoryPhotos,
  type PendingStoryPhoto,
} from "../utils/pendingStoryUploads";

interface PendingStoryUploadsState {
  items: PendingStoryPhoto[];
  hydrated: boolean;
  /** Loads what was already queued before this page load — a photo added
   * with no signal and then closed stays queued until this runs again. */
  hydrate: () => Promise<void>;
  /** Returns null when it couldn't even be queued (IndexedDB unavailable,
   * e.g. a private-browsing tab) — the caller falls back to a plain error. */
  add: (eventDayId: string, blob: Blob) => Promise<PendingStoryPhoto | null>;
  remove: (id: string) => Promise<void>;
}

export const usePendingStoryUploadsStore = create<PendingStoryUploadsState>((set, get) => ({
  items: [],
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const items = await listPendingStoryPhotos();
      set({ items, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  add: async (eventDayId, blob) => {
    try {
      const item = await addPendingStoryPhoto(eventDayId, blob);
      set((s) => ({ items: [...s.items, item] }));
      return item;
    } catch {
      return null;
    }
  },
  remove: async (id) => {
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    try {
      await removePendingStoryPhoto(id);
    } catch {}
  },
}));
