import { useEffect } from "react";
import { usePageHeaderStore, type PageHeader } from "../store/pageHeader.store";

/**
 * A detail page (an event, reached from the Agenda or the Hub) gives the top bar its own title and a back arrow, so it
 * does not look like the page it was opened from. The bar goes back to its usual page name when the page unmounts.
 */
export function usePageHeader({ title, subtitle, backTo }: PageHeader) {
  const set = usePageHeaderStore((s) => s.set);
  useEffect(() => {
    set({ title, subtitle, backTo });
    return () => set(null);
  }, [set, title, subtitle, backTo]);
}
