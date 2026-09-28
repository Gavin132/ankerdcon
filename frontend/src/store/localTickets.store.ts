import { create } from "zustand";
import {
  addLocalTicket,
  removeLocalTicket,
  listLocalTickets,
  type LocalTicket,
} from "../utils/localTickets";

interface LocalTicketsState {
  items: LocalTicket[];
  hydrated: boolean;
  /** Loads whatever was already added on this device — safe to call from
   * every mount; only the first call actually reads IndexedDB. */
  hydrate: () => Promise<void>;
  /** Returns null when it couldn't even be stored (IndexedDB unavailable,
   * e.g. a private-browsing tab, or the device is out of storage) — the
   * caller falls back to a plain error. */
  add: (eventId: string, file: File) => Promise<LocalTicket | null>;
  remove: (id: string) => Promise<void>;
}

export const useLocalTicketsStore = create<LocalTicketsState>((set, get) => ({
  items: [],
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const items = await listLocalTickets();
      set({ items, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  add: async (eventId, file) => {
    try {
      const item = await addLocalTicket(eventId, file);
      set((s) => ({ items: [...s.items, item] }));
      return item;
    } catch {
      return null;
    }
  },
  remove: async (id) => {
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    try {
      await removeLocalTicket(id);
    } catch {
      // best effort — the item is already gone from the visible list
    }
  },
}));
