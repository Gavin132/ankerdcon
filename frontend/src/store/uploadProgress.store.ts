import { create } from "zustand";

interface UploadProgressState {
  /** Bytes sent and in total, per request that is uploading right now. */
  active: Record<string, { loaded: number; total: number }>;
  update: (id: string, loaded: number, total: number) => void;
  finish: (id: string) => void;
}

/** What is being uploaded and how far it is, fed by the API client for every request that carries a file (see
 * `lib/api/client.ts`) and shown once for the whole app by `UploadProgress`. */
export const useUploadProgressStore = create<UploadProgressState>((set) => ({
  active: {},
  update: (id, loaded, total) => set((s) => ({ active: { ...s.active, [id]: { loaded, total } } })),
  finish: (id) =>
    set((s) => {
      if (!(id in s.active)) return s;
      const { [id]: _done, ...rest } = s.active;
      return { active: rest };
    }),
}));

/** 0-100 over everything uploading, or null when nothing is. */
export function overallProgress(active: UploadProgressState["active"]): number | null {
  const all = Object.values(active);
  const total = all.reduce((sum, u) => sum + u.total, 0);
  if (all.length === 0 || total === 0) return null;
  return Math.min(100, Math.round((all.reduce((sum, u) => sum + u.loaded, 0) / total) * 100));
}
