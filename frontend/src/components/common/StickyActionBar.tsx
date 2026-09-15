import type { ReactNode } from "react";
import { CONTENT_WIDTH } from "../layout/contentWidth";

/**
 * Pins its content (typically a primary "add" button) just above the bottom
 * nav, so the main action on a tab stays within thumb reach on mobile instead
 * of scrolling away with the page content. From md it is a normal-width button
 * floating at the bottom right of the content column.
 */
export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-30 px-4 pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))] md:bottom-6 md:left-[76px] md:px-8 lg:left-60 lg:px-10">
      <div className={`pointer-events-auto mx-auto md:pointer-events-none md:flex md:justify-end md:[&>*]:pointer-events-auto md:[&>*]:w-auto ${CONTENT_WIDTH}`}>{children}</div>
    </div>
  );
}
