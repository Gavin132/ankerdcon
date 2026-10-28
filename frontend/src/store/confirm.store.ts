import { create } from "zustand";

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Deleting something: the confirm button is red and the icon says "problem" instead of "careful". */
  destructive?: boolean;
}

interface ConfirmStore {
  request: (ConfirmRequest & { resolve: (ok: boolean) => void }) | null;
  ask: (request: ConfirmRequest) => Promise<boolean>;
  answer: (ok: boolean) => void;
}

/** A question the user answers before something goes on, from code that is not a component
 * (an upload loop, say). Shown by `ConfirmHost`. A second question while one is open
 * counts the first as "no". */
export const useConfirmStore = create<ConfirmStore>((set, get) => ({
  request: null,
  ask: (request) =>
    new Promise<boolean>((resolve) => {
      get().request?.resolve(false);
      set({ request: { ...request, resolve } });
    }),
  answer: (ok) => {
    get().request?.resolve(ok);
    set({ request: null });
  },
}));

export const askConfirm = (request: ConfirmRequest) => useConfirmStore.getState().ask(request);
