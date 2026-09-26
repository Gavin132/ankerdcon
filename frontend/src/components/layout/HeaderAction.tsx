import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export const HEADER_ACTIONS_ID = "header-actions";

/**
 * Puts a page's own action (e.g. Share on Event › Overzicht) in the top bar,
 * beside the account menu. The bar is mounted once above every page, so a
 * page renders this to hand it a button instead of the bar knowing about it.
 */
export function HeaderAction({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => setTarget(document.getElementById(HEADER_ACTIONS_ID)), []);
  return target ? createPortal(children, target) : null;
}
