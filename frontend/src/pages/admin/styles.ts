/** Shared Tailwind class strings for the admin portal (flat design, see docs/design-system.md). */

/** Text input inside admin drawers. Compact version of `input-field`. */
export const F =
  "input-field px-3 py-2.5 text-base sm:text-sm";

/** Use for <select> elements. `.dark .input-field` sets the dark color-scheme so native options stay readable. */
export const FS =
  "input-field px-3 py-2.5 text-base sm:text-sm";

export const L = "field-label";

/** The title of a block of fields in a sheet ("Basisgegevens"). */
export const SECTION_TITLE = "section-label";

/** A block of fields in a sheet: no card of its own (the sheet is the card), a divider between blocks. */
export const SECTION = "space-y-3 border-t border-line pt-5 first:border-t-0 first:pt-0";

/** Flat panel that holds a table or a list. */
export const PANEL = "card-surface overflow-hidden";

/** Table header row cells (`<th>`). */
export const TH = "th";

/** Table body cells (`<td>`). On a phone `.stack-table` takes the padding away again; the `<tbody>` has `divide-y`. */
export const TD = "px-5 py-3.5 align-middle";

/** Table body row: hover sunken. A selected row (the checkbox is ticked) is `TR_SELECTED` instead of the hover. */
export const TR = "group transition-colors hover:bg-sunken";
export const TR_SELECTED = "group transition-colors bg-brand-soft/50 hover:bg-brand-soft/70";

/** Primary action (brand blue, ink outline, flat). At least 44 px tall. */
export const BTN_PRIMARY = "btn-primary min-h-[44px] px-4 py-2.5 text-sm";

/** Secondary action (see `.btn-secondary` in index.css). */
export const BTN_SECONDARY = "btn-secondary px-4 py-2.5 text-sm";

/** Destructive confirm (see `.btn-danger` in index.css): the red "Verwijderen". */
export const BTN_DANGER = "btn-danger px-4 py-2.5 text-sm";

/** A checkbox with its text: the whole line is the hit area (44 px). */
export const CHECK_ROW = "flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-ink-2";

/** Small uppercase tag next to a name ("Gast", "Kijker"). */
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
