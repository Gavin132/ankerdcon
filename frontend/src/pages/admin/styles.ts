/** Shared Tailwind class strings for the admin portal (flat design, see docs/design-system.md). */

/** Text input inside admin drawers. Compact version of `input-field`. */
export const F =
  "input-field rounded-[9px] px-3 py-2.5 text-base sm:text-sm";

/** Use for <select> elements. `.dark .input-field` sets the dark color-scheme so native options stay readable. */
export const FS =
  "input-field rounded-[9px] px-3 py-2.5 text-base sm:text-sm";

export const L = "field-label";

/** Uppercase section title inside a SECTION card. */
export const SECTION_TITLE =
  "font-mono text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-3";

export const SECTION =
  "space-y-3 rounded-xl border-1.5 border-line bg-surface p-4";

/** Flat panel that holds a table or a list. */
export const PANEL = "card-surface overflow-hidden";

/** Table header row cells (`<th>`). */
export const TH = "th";

/** Table body cells (`<td>`). Pair rows with `TR`. */
export const TD = "border-b border-line px-4 py-3 align-middle text-[13.5px] text-ink";

/** Table body row: hover sunken, no border on the last row. */
export const TR = "transition-colors hover:bg-sunken [&:last-child>td]:border-b-0";

/** Primary action (brand blue, ink outline, flat). At least 44 px tall. */
export const BTN_PRIMARY = "btn-primary min-h-[44px] px-4 py-2.5 text-sm";

/** Secondary action (see `.btn-secondary` in index.css). */
export const BTN_SECONDARY = "btn-secondary px-4 py-2.5 text-sm";

/** Destructive confirm (see `.btn-danger` in index.css): the red "Verwijderen". */
export const BTN_DANGER = "btn-danger px-4 py-2.5 text-sm";

/** Small uppercase mono tag. */
export const TAG = "tag";

/** Status pills (`.pill` in index.css). */
export const PILL = "pill";
export const PILL_OK = "pill pill-ok";
export const PILL_WARN = "pill pill-warn";
export const PILL_BAD = "pill pill-bad";
export const PILL_NEUTRAL = "pill pill-neutral";

/** Selected / unselected filter chip (`.chip` in index.css). */
export const CHIP = "chip";
export const CHIP_ON = "chip chip-on";
export const CHIP_OFF = "chip chip-off";

/** Square icon button (edit, delete, close): `.icon-btn` in index.css. */
export const ICON_BTN = "icon-btn";
