import { create } from "zustand";

export interface PageHeader {
  /** Replaces the bar's page name, e.g. the name of the trip. */
  title: string;
  subtitle?: string;
  /** Where the back arrow goes when there is no earlier page to go back to (a shared link opened first). */
  backTo: string;
}

interface PageHeaderStore {
  header: PageHeader | null;
  set: (header: PageHeader | null) => void;
}

/** What a detail page tells the top bar about itself (see `usePageHeader`). The bar is mounted once above every page. */
export const usePageHeaderStore = create<PageHeaderStore>((set) => ({
  header: null,
  set: (header) => set({ header }),
}));
