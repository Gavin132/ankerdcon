import type { ReactNode } from "react";

/**
 * Pins its content (typically a primary "add" button) just above the bottom
 * nav, so the main action on a tab stays within thumb reach on mobile instead
 * of scrolling away with the page content.
 */
export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div
      className="fixed inset-x-0 z-30 px-4 pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))]"
      style={{ bottom: "max(5.5rem, calc(env(safe-area-inset-bottom, 0px) + 5.5rem))" }}
    >
      <div className="mx-auto max-w-2xl">{children}</div>
    </div>
  );
}
