/** Shared Tailwind class strings for the admin portal (flat design, see docs/design-system.md). */

/** Text input inside admin drawers. Compact version of `input-field`. */
export const F =
  "input-field rounded-[9px] px-3 py-2.5 text-base sm:text-sm";

/** Use for <select> elements. `.dark .input-field` sets the dark color-scheme so native options stay readable. */
export const FS =
  "input-field rounded-[9px] px-3 py-2.5 text-base sm:text-sm";

export const L = "mb-1 block text-xs font-medium text-ink-2";

/** Uppercase section title inside a SECTION card. */
export const SECTION_TITLE =
  "font-mono text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-3";

export const SECTION =
  "space-y-3 rounded-xl border-1.5 border-line bg-surface p-4";

/** Flat panel that holds a table or a list. */
export const PANEL = "card-surface overflow-hidden";

/** Table header row cells (`<th>`). */
export const TH =
  "whitespace-nowrap border-b-1.5 border-line px-4 py-2 text-left font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3";

/** Table body cells (`<td>`). Pair rows with `TR`. */
export const TD = "border-b border-line px-4 py-3 align-middle text-[13.5px] text-ink";

/** Table body row: hover sunken, no border on the last row. */
export const TR = "transition-colors hover:bg-sunken [&:last-child>td]:border-b-0";

/** Primary action (cyan, ink outline, hard shadow). Add padding and text size. */
export const BTN_PRIMARY = "btn-primary px-4 py-2.5 text-sm disabled:opacity-50";

/** Secondary action. */
export const BTN_SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-xl border-1.5 border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink-3 disabled:opacity-50";

/** Small uppercase mono tag. */
export const TAG =
  "inline-flex items-center rounded-md border border-line px-1.5 font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-2";

/** Status pills. */
export const PILL = "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold";
export const PILL_OK = `${PILL} bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300`;
export const PILL_WARN = `${PILL} bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300`;
export const PILL_BAD = `${PILL} bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300`;
export const PILL_NEUTRAL = `${PILL} bg-sunken text-ink-2`;

/** Selected / unselected filter chip. */
export const CHIP = "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors";
export const CHIP_ON = `${CHIP} border-1.5 border-transparent bg-ink text-paper dark:bg-brand dark:text-brand-on`;
export const CHIP_OFF = `${CHIP} border-1.5 border-line bg-surface text-ink-2 hover:border-ink-3`;

/** Square icon button (edit, delete, close). */
export const ICON_BTN =
  "flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40";
