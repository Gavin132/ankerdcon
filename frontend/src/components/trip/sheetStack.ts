import { useSyncExternalStore } from "react";

/**
 * Which sheets are open, bottom first, and how tall each is. A sheet opened over another does
 * not hide it: the one underneath slides to just above the new one and shows only its top bar,
 * dimmed by the new sheet's backdrop, like two pages laid over each other. This is the shared
 * bookkeeping that makes that possible; TripSheet does the drawing.
 */
export interface OpenSheet {
  id: string;
  /** Rendered height in px; 0 until measured. */
  height: number;
}

/** How much of a sheet underneath shows above the one on top of it: the pill and its title. */
export const PEEK_PX = 56;

let sheets: OpenSheet[] = [];
const listeners = new Set<() => void>();

function publish(next: OpenSheet[]) {
  sheets = next;
  listeners.forEach((l) => l());
}

export function registerSheet(id: string) {
  if (!sheets.some((s) => s.id === id)) publish([...sheets, { id, height: 0 }]);
}

export function unregisterSheet(id: string) {
  if (sheets.some((s) => s.id === id)) publish(sheets.filter((s) => s.id !== id));
}

export function setSheetHeight(id: string, height: number) {
  if (sheets.some((s) => s.id === id && s.height !== height)) {
    publish(sheets.map((s) => (s.id === id ? { ...s, height } : s)));
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSheetStack(): OpenSheet[] {
  return useSyncExternalStore(subscribe, () => sheets, () => sheets);
}

/**
 * How far (in px, down is positive) the sheet at `index` has to move so that its top edge sits
 * `PEEK_PX` above the sheet over it, which in turn sits `PEEK_PX` above the one over that, up to the
 * topmost. Sheets are bottom-aligned, so a sheet's natural top edge is its own height up from the
 * bottom; the target is the topmost sheet's height plus a strip for every sheet in between.
 *
 * A shorter sheet moves up to meet its strip, a taller one down; the part that no longer fits is
 * under the sheet on top, or off the screen.
 */
export function peekOffset(stack: OpenSheet[], index: number): number {
  const top = stack[stack.length - 1];
  if (!top || index < 0 || index >= stack.length - 1) return 0;
  return stack[index].height - top.height - PEEK_PX * (stack.length - 1 - index);
}

/** For tests: forget every sheet. */
export function resetSheetStack() {
  publish([]);
}
