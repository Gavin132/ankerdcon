import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (type, message) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// After a read-only notice, the generic "kon niet ..." error of the screen that tried (which does not
// know why) would only contradict it.
let quietErrorsUntil = 0;
const QUIET_ERRORS_MS = 2000;

/** Tells a read-only member why nothing happened, and keeps the error toast that follows quiet. */
export function toastReadOnly(message: string): void {
  quietErrorsUntil = Date.now() + QUIET_ERRORS_MS;
  useToastStore.getState().addToast("info", message);
}

/** Convenience function — call outside React components. */
export function toast(type: ToastType, message: string): void {
  if (type === "error" && Date.now() < quietErrorsUntil) return;
  useToastStore.getState().addToast(type, message);
}
