# Design system

The look approved in September 2026 (see `docs/ui-proposal/ui-rework-proposal.html`):
flat, based on the Ankerd anchor mascot. Ink outlines, one blue brand fill (`#57B2F9`), status
colours only for status, calm screens.

The tokens live in `frontend/tailwind.config.ts` and `frontend/src/index.css`. To see the
components in use, look at `pages/trip/TripOverviewTab.tsx` and `components/trip/`.

## Rules

- **Flat.** No gradients, no `backdrop-blur`, no glass, no soft card shadows, no
  glows or decorative blurred circles. Nothing lifts or scales on hover
  (`whileHover`, `hover:-translate-y`, `hover:scale`). Hover changes a border or
  background colour only.
- **One bold element per screen** gets the 2px ink outline (`border-2 border-outline`),
  for example the Hub ticket or a trip's headline block. Everything else uses the
  1.5px `border-line`.
- **Accent colour is a personal setting** (Instellingen → Accentkleur: blue, turquoise, green,
  gold, orange, pink, purple; per device). It only swaps the brand tokens (`--cyan`,
  `--cyan-soft`, `--cyan-text`, and `--nav-active-bg` in dark mode) through `[data-accent]`
  blocks in `index.css`; paper, surface, ink and the status colours never change. So **use the
  brand tokens (`bg-brand`, `bg-brand-soft`, `text-brand-text`), not `sky-*`, for anything that
  means "the app's colour"** (spinners, links, selected states), or it stays blue for everyone
  who picked another accent. `sky-*` is for things that are blue on purpose. A new accent needs
  a fill, a tint and a text colour that is 4.5:1 on white, and their dark counterparts, and an
  entry in `ACCENTS` (`theme.store.ts`).
- **Blue (`#57B2F9`) is the brand fill**, for the main action and the one bold
  element. Text on the brand fill is ink (`text-brand-on`), never white. The fill is
  too light to use as text, so brand-coloured text and links use `text-brand-text`
  (`#0D75D1` light, `#89CAFE` dark).
- **No floating UI.** No floating action buttons and no sticky "add" bars over the
  content. A page's main action lives in its content (a header row above the list) or in
  the top bar (`HeaderAction`). Things that open over a page are sheets (see below).
- **Status colours are for status only:** emerald = ok/paid, amber = needs
  attention, rose = problem/destructive. Don't use violet, indigo, purple, blue or
  teal as decoration. Where a component used them to tell categories apart,
  prefer ink/grey plus an icon. Keep a colour only when it carries meaning the user
  relies on (a user's own avatar colour, a badge's own colour).
- **Calm density.** Don't add avatar stacks or buttons to every row. Remove
  decorative background icons and watermarks inside cards.
- **Compact mode is a personal setting, not a design decision.** Instellingen →
  Dichtheid tightens `gap-*`, `space-y-*`, `space-x-*` and `p(x/y)-*` in the row/card
  range (1.5 through 5) app-wide by overriding those Tailwind classes at higher
  specificity under `.density-compact` (`index.css`, applied via `store/theme.store.ts`
  as a class on `<html>`) — not by any component branching on it. A new component
  using these ordinary utility classes picks it up automatically; nothing extra is
  needed. Page-level spacing (6 and up) is deliberately left alone, so this changes
  the density of what's on a page, not the page's own layout.

## Tokens

Prefer the semantic tokens; they switch automatically in dark mode, so no `dark:`
variant is needed with them.

| Token | Use |
| --- | --- |
| `bg-paper` | page background |
| `bg-surface` | cards, panels, drawers, menus |
| `bg-sunken` | wells, icon squares, hover rows, skeletons, segmented-control track |
| `text-ink` / `text-ink-2` / `text-ink-3` | primary / secondary / muted text and icons |
| `border-line` | normal borders and dividers (`border-1.5`, dividers `h-px bg-line`) |
| `border-outline` | the bold 2px outline, primary button border |
| `bg-brand`, `text-brand-on` | brand blue fill with ink text |
| `bg-brand-soft`, `text-brand-text` | soft blue background, blue text/links |
| `bg-hatch-surface` | striped surface for travel days |
| `text-ok` / `text-warn` / `text-bad`, `bg-ok-soft` / `bg-warn-soft` / `bg-bad-soft` | status text and its tint (emerald / amber / rose); they switch in dark mode by themselves, so no `dark:` twin. Use these, not raw `emerald-*`, `amber-*` or `rose-*`, in new code |

`slate-*` and `sky-*` are remapped to the new greys and the brand blue, so existing classes
already look right; converting them to tokens is still preferred when you touch a
line, because tokens also handle dark mode.

## Type

Two typefaces, loaded from Google Fonts in `index.html`: **Poppins** for everything, and
**Big Shoulders Display** (a condensed face) for the big things only.

| Class | Renders as | Use |
| --- | --- | --- |
| `font-display font-extrabold uppercase leading-[0.95]` | Big Shoulders Display | page and hero titles, event names, big numbers (countdowns, room numbers, day numbers). 34–42px page titles, 22–26px section/card titles. |
| `font-sans` (default) | Poppins | all UI and body text. Headings inside cards: `font-semibold`. Avoid `font-black` on Poppins (it is mapped one step lighter). |
| `font-mono` | **Poppins** | times, dates, amounts (`tabular-nums`), and small labels. The class name is kept from when this was a monospaced face; it now only says "this is a label or a figure". |
| `section-label` | Poppins, small, uppercase, tracked | the label above a group ("Voor jou") |

Small **subtext under a title or on a card** (a hint, a status line, "Naar hotel · nu") is
plain Poppins in the text's own capitalisation: no `uppercase`, no letter-spacing. Reserve
uppercase labels for `section-label`, `label-quiet` kickers, chips and tags.

**Data is sentence case, labels are uppercase.** A date, a count or a name that is *content* ("di 17 · do 19 nov",
"Di" above a day number, the date line of a cosplay, "1 van 2 bezet") is written the way you would say it. Only a
label that names a group or a field is uppercase mono. So the day tiles on the Hub, the day cards of a trip and the
date line of a cosplay card all read "Di", "Wo" and "di 17 · do 19 nov".

**Nothing the member has to read is smaller than 12px.** Use `text-xs` or `text-[12px]` as the floor for
labels, chips, hints and the tab bar. Smaller is only for the initials and "+3" counters inside a small
avatar circle, which are part of the picture. (Not enforced by a tool: check new `text-[…px]` classes.)

## Wording (Dutch UI text)

- **"evenement", never "event"** in anything a member or admin reads (the one exception is the name of the *Event* tab, which is the product's own word and does not fit as
  "Evenement" in a phone tab bar). Code, routes, API fields and the docs keep `event`. An activity is an "activiteit", not an "evenement".
- **"Meldingen"**, not "Notificaties" (Instellingen row, page title, onboarding step, toasts).
- **Buttons are the infinitive:** "Annuleren", "Verwijderen", "Opslaan", "Sluiten", "Toevoegen", "Aanmaken",
  "Kopiëren". Not "Annuleer" or "Verwijder".
- **Plurals are right:** "1 groep", "2 groepen", "1 activiteit".
- **Settled money is "Verrekend"** (shares and settlements alike), what you still owe is "Te betalen"; the caption
  of the balance is "Netto te ontvangen" / "Netto te betalen".
- **No English in the admin panel either:** the stored ride values `Inbound` / `Outbound` and `Car` / `Public
  Transport` show as Heen / Terug and Auto / Openbaar vervoer (`DIRECTION_LABEL`, `VEHICLE_LABEL` in
  `pages/admin/constants.ts`). "Toegangslijst" (not whitelist), "Beheer" (not Admin portal), "Testomgeving",
  "ledenportaal", "Ankerd-leden".
- **Errors say what went wrong and what to do:** "Kon de activiteit niet verwijderen. Probeer het opnieuw."

Page head pattern (see `TripLayout`, `HubPage`):

```tsx
<p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">Kicker · context</p>
<h1 className="mt-1 font-display text-[34px] font-extrabold uppercase leading-[0.95] text-ink md:text-[42px]">Title</h1>
```

## Components and patterns

- **Panel / card:** `card-surface` (surface, 1.5px line border, 12px radius) with
  `overflow-hidden`. Clickable: `card-surface-hover` (border darkens on hover).
- **Panel header:** `section-label` on the left, an optional `text-[12.5px] font-semibold text-brand-text` link on the right.
- **List rows inside a panel:** `divide-y divide-line` or `border-t border-line`, row hover `hover:bg-sunken`.
- **Icon square: all or none.** Use it only where every item of the same list or grid has one (the tiles on the Event page, the rows in Instellingen); a heading with an icon next to a heading without one reads as a mistake, and the square pushes the text in. Inside a sheet (Hotel, Praktisch) the headings have no icon. `flex h-8 w-8 items-center justify-center rounded-lg bg-sunken text-ink`; status versions are `icon-tile-ok`, `icon-tile-warn` and `icon-tile-bad` (colours and shape; add the size, `h-8 w-8`).
- **Pill (status):** `inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold` in the status colours above; neutral: `bg-sunken text-ink-2`.
- **Tag:** `tag` (`rounded-md border border-line px-1.5`, small uppercase label, 12px). A chip is the filter pill below.
- **One blue button per view.** The main action of a screen or sheet is `btn-primary`; the same action repeated in each section of a list ("Rit aanbieden" for Heen and for Terug) is `btn-secondary`, so the eye has one place to go.
- **Buttons:** use `<Button>` (`primary` blue with an ink outline, `secondary`, `ghost`, `danger`; all flat, no shadows). For a raw element: `btn-primary px-4 py-2.5 text-sm` or `btn-secondary px-4 text-sm` (both defined in `index.css`; a disabled `btn-primary` turns flat grey by itself). On/off settings use `components/common/Switch.tsx`. Shared classes in `index.css`: `.pill` + `.pill-ok|warn|bad|neutral` (status: fine / waiting for you / you owe / info), `.chip` + `.chip-on|off` (filters), `.notice-warn` / `.notice-ok` (a bordered message block), `.icon-btn`, `.field-label` and `.field-error` (forms), `.stack-table` with `cell-main` and `cell-actions` (a data table that becomes cards on a phone: the name cell takes what is left of the line and may shrink, the actions never shrink; a `ConfirmInline` in the actions cell takes a line of its own), `.btn-danger` (the red confirm, same as `<Button variant="danger">`) and `.btn-danger-soft` (the quiet red one that opens the question), both 44 px tall. Popups are `TripSheet` (`Modal` is a thin wrapper around it). A control under 44 px gets `hit-area`.
- **Segmented control:** `<Segmented options value onChange label>` (`components/common/Segmented.tsx`, styled by `.segmented` and `.segmented-item` in `index.css`): a sunken track and the chosen item as a surface with the ink outline, 36 px to look at and 44 px to hit. `fill` shares the full width between the items (a sheet), `scroll` lets a long row (years) scroll sideways. Used for Tickets/Recap, the recap filter, the years of the collected stubs, Heen/Terug in the quick-ride sheet and the split mode of an expense. Never paste the classes into a screen.
- **Pager:** `<Pager count index onChange dotLabel prevLabel nextLabel>` (`components/common/Pager.tsx`): the dots (44 px to hit, the active one a bar) and the two arrows (`icon-btn`) under a row of cards you page through, on the Hub and in the Agenda stack. `arrowsFrom="md"` hides the arrows on a phone, where you swipe. A pager never moves by itself: a carousel on a timer fails people who need longer to read, and the design is calm.
- **Avatar stack:** `<AvatarStack names size max>` (`components/common/AvatarStack.tsx`): the overlapping faces of a list of stored names with "+N" for the rest. It counts *people* through `groupPeople`, so one person under two names shows once. Sizes `xs` (20 px), `sm` (24), `md` (28); `ringClass` matches the background it sits on. Default `max` is 5.
- **Seat picker:** `<SeatPicker value onChange>` (`components/common/SeatPicker.tsx`): one row of 2 to 7 chips, "Incl. jezelf", in every sheet that asks how many seats a car has.
- **Selected chip (filters, day chips):** active `bg-ink text-paper` (in dark mode `bg-brand text-brand-on`), inactive `border-1.5 border-line bg-surface text-ink-2 hover:border-ink-3`.
- **Inputs:** `input-field`.
- **Hero blocks** (event, ride, meal headers): a flat ink block (`bg-hero text-hero-ink`, tokens that stay dark in light mode too,
  rounded 14px, `border-2 border-outline`) or the event image with a flat dark overlay
  (`bg-hero/60`, no gradient ramps). Title in the display face. White-ish chips are `HeroChip`
  (`components/common/HeroActions.tsx`, tones neutral / warn / bad; `heroChipClass()` when the chip is a link). The
  actions on it are `HeroActions` with a `HeroSecondaryButton` (outlined) and the one `HeroPrimaryButton`, both 40 px
  tall (`MealHero`, `RideHero`).
- **Sheets** (`TripSheet`): the standard way to open something over a page. `Modal` is a thin wrapper and passes its `footer` on, so the main button of a small question sits under the scrolling body like everywhere else. A bottom sheet with a
  title, optional back arrow and a footer for the main action; several views (list, form, filter) swap
  inside one sheet with `viewKey`. Used for trip parts, expenses, settle-up, and more. There is no
  right-hand drawer any more: the admin panel's edit panels (`AdminDrawer`) and its
  unsaved-changes confirmation are `TripSheet`s too (`stacked` puts the confirmation above the form).
  **A sheet opened over another sheet** does not hide it: the one underneath slides to just above the new
  one and shows only its top bar (pill and title, 56 px of it per sheet), dimmed by the new sheet's
  lighter backdrop, like two pages laid over each other. Tapping the dimmed area, Escape or the back
  gesture closes the top one, and the one underneath slides back. `components/trip/sheetStack.ts` keeps
  the open sheets and their heights; `TripSheet` does the drawing, so no caller has to do anything.
  A sheet over something that is not a `TripSheet` still needs `stacked`.
- **Modals, menus, popovers:** `bg-surface border-1.5 border-line`, may keep
  `shadow-xl` (floating layers are the only thing with a shadow). Backdrop `bg-slate-950/50`, no blur.
- **Empty states:** `<EmptyState icon title description action>`: icon in an `h-12 w-12 rounded-xl bg-sunken text-ink-3` square, `text-sm font-semibold text-ink` title, `text-xs text-ink-3` body. `compact` (`py-8` instead of `py-16`) inside a card or a table cell.
- **Asking before a delete:** a delete that takes other things with it (a day, a selection of rows) goes through `askConfirm` (`store/confirm.store.ts`, shown by `ConfirmHost`): a dialog with "Annuleren" and a red "Verwijderen" (`destructive: true`). Taking one row out of a list inside a card or table uses the two-step `ConfirmInline` (`pages/admin/components/`): the question, "Annuleren", the red confirm, all 44 px tall.
- **Skeletons:** `bg-sunken animate-pulse`.
- **Tables (admin):** header cells `th` (`label-quiet`, `border-b-1.5 border-line`; `TH` in `pages/admin/styles.ts`), cells `border-b border-line`, row hover `bg-sunken`, amounts right-aligned `font-mono tabular-nums`. The checkbox of a row is `RowCheckbox` (16 px to look at, 44 px to hit). The actions for the selected rows (`AdminBulkBar`) are a strip in the page right above the table, never a bar floating over it.
- **Quiet uppercase label:** `label-quiet` (12px, medium weight) for the kicker above a title and for table headers; `section-label` (semibold) for the label above a group.
- **Motion:** fades and height transitions are fine; no bouncy springs on content, no hover movement.

## Touch (phones)

- **A control is at least 44×44px to hit**, however small it looks. Add `hit-area` to a small icon button
  (an `h-8 w-8` close or copy button): an invisible box grows its touch area to 44px without moving
  anything. Not on a control with `overflow-hidden` (the box would be clipped). The class is in
  `index.css`; adding it to many controls was done once with a script, so new ones need it by hand.
  **Re-space what would overlap:** two `hit-area` controls closer than 44px centre to centre fight over the
  overlap (the later one in the DOM wins), so a row of small icon buttons is `h-9 w-9` with `gap-2` (pitch 44),
  not `h-7 w-7` with `gap-1`. A row of chips or swatches the same: 36px items with at least 8px between them.
- **An icon-only button has an `aria-label`** (a `title` is not read by every screen reader and does not exist on
  a phone). The label says what it does to what: "Alias Sam verwijderen", "Kamer 214 bewerken".
- **A tile or card that opens something is one link, not a box that holds other buttons.** `TripTile` makes its
  label the `Link` (or the button) and stretches it over the tile with `after:absolute after:inset-0`; the pill,
  the "+" and the thumbnails are `relative` siblings that stay tappable on top. Never put an `<a>` or a
  `role="button"` inside another one.
- **Full-screen layers are dialogs:** `role="dialog" aria-modal="true" aria-label="…"` on the story viewer, the
  search and the cosplay lightbox, Escape closes them, and focus goes back to what opened them.
- **Hover styles only apply where the device can hover** (`future.hoverOnlyWhenSupported` in
  `tailwind.config.ts`), so a tap on a phone does not leave an element stuck in its hover state. Hand-written
  `:hover` CSS goes inside `@media (hover: hover)` for the same reason.
- **A press dims whatever is pressed** (`button`, `a[href]`, `role="button"`, 70% opacity, in
  `index.css`), because on a touchscreen nothing hovers and a tap would otherwise show no feedback. It has
  the lowest specificity: a component with its own pressed state (`active:scale-…`) wins.
- **A text field is 16px or bigger** (`input-field` is `text-base`); below that iOS zooms the page in when
  the field gets focus. Give fields the keyboard they need: `inputMode="decimal"` for amounts,
  `"numeric"` for counts, `type="tel"` with `autoComplete="tel"`, `enterKeyHint="search"` on search boxes.
- **Full-height screens use `min-h-dvh` / `h-dvh`**, not `min-h-screen` / `h-screen`: on iOS Safari `100vh`
  is taller than what is visible and puts the bottom under the toolbar.
- **Animations follow the device's "reduce motion" setting** (`MotionConfig reducedMotion="user"` in `App.tsx`:
  transforms are skipped, fades stay). So **nothing the app depends on may be an animation**: a timer that
  moves the story on, say, is driven by hand (see `StoryViewer.tsx`), or it would fire at once.
- **Pictures are sized to where they are shown**: photos use their thumbnail in grids and the preview in the
  viewer (`utils/storyMedia.ts`), profile pictures ask for their display size (`avatarSrc()` in
  `utils/avatar.ts`), and below-the-fold images are `loading="lazy" decoding="async"`.

## Layout

- **Spacing:** the blocks of a page are `space-y-5` apart; detail and settings pages are `px-4 py-5 sm:py-8` (the same side padding as `DetailTopbar`, so the title lines up with the content). Inside a card, 3 or 4.
- **The row of a car you ride in** (`MINE_CLASS`, `components/transport/mine.ts`): `bg-brand-soft`, a `border-l-4 border-brand-text` bar, ink text. It follows the accent colour; never a solid blue block.
- **Banners above the header:** one at a time. An announcement shows; the "what's new" strip only when there is no announcement.
- Desktop (lg, ≥1024px): sidebar (`Sidebar.tsx`), content up to `max-w-5xl` from xl.
- Tablet (md): icon rail. Phone: bottom tab bar (`BottomNav.tsx`).
- The top bar takes one page action through `HeaderAction`. Detail and settings pages (outside
  the shell) use `DetailTopbar`.
- The admin time-travel tool (`TimeTravelControl`) lives in the chrome, never floating over content: a row at the bottom of the sidebar, an icon in the phone, detail and admin top bars.
- Pages can use more room on wide screens (two columns from `xl` where it helps),
  but single-column pages should stay readable: cap long text blocks around `max-w-3xl`.
