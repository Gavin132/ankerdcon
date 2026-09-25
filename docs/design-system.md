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
uppercase labels for `section-label` and chips.

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
- **Icon square:** `flex h-8 w-8 items-center justify-center rounded-lg bg-sunken text-ink`; status versions use `bg-rose-100 text-rose-700` / `bg-amber-100 text-amber-800` / `bg-emerald-100 text-emerald-700` with `dark:bg-*-500/15 dark:text-*-300`.
- **Pill (status):** `inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold` in the status colours above; neutral: `bg-sunken text-ink-2`.
- **Tag / chip:** `rounded-md border border-line px-1.5 font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-2`.
- **Buttons:** use `<Button>` (`primary` blue with an ink outline, `secondary`, `ghost`, `danger`; all flat, no shadows). For a raw element: `btn-primary px-4 py-2.5 text-sm`, or secondary `rounded-xl border-1.5 border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:border-ink-3`.
- **Segmented control:** track `flex gap-1 rounded-[10px] border-1.5 border-line bg-sunken p-[3px]`, item `rounded-[7px] px-3 py-1.5 text-[13px] font-semibold text-ink-2`, active item `bg-surface text-ink shadow-[0_0_0_1.5px_rgb(var(--outline))]`.
- **Selected chip (filters, day chips):** active `bg-ink text-paper` (in dark mode `bg-brand text-brand-on`), inactive `border-1.5 border-line bg-surface text-ink-2 hover:border-ink-3`.
- **Inputs:** `input-field`.
- **Hero blocks** (event, ride, meal headers): a flat ink block (`bg-[#0F1519] text-[#E6F0F3]`,
  rounded 14px, `border-2 border-outline`) or the event image with a flat dark overlay
  (`bg-[#0F1519]/60`, no gradient ramps). Title in the display face. White-ish chips:
  `border border-white/25 bg-white/10 font-mono text-[10.5px] uppercase text-[#E6F0F3]`.
  Primary action on it: `btn-primary`.
- **Sheets** (`TripSheet`): the standard way to open something over a page. A bottom sheet with a
  title, optional back arrow and a footer for the main action; several views (list, form, filter) swap
  inside one sheet with `viewKey`. Used for trip parts, expenses, settle-up, and more. There is no
  right-hand drawer any more.
- **Modals, menus, popovers:** `bg-surface border-1.5 border-line`, may keep
  `shadow-xl` (floating layers are the only thing with a shadow). Backdrop `bg-slate-950/50`, no blur.
- **Empty states:** icon in an `h-12 w-12 rounded-xl bg-sunken text-ink-3` square, `text-sm font-semibold text-ink` title, `text-xs text-ink-3` body.
- **Skeletons:** `bg-sunken animate-pulse`.
- **Tables (admin):** header cells `font-mono text-[10.5px] uppercase tracking-[0.09em] text-ink-3 border-b-1.5 border-line`, cells `border-b border-line`, row hover `bg-sunken`, amounts right-aligned `font-mono tabular-nums`.
- **Motion:** fades and height transitions are fine; no bouncy springs on content, no hover movement.

## Layout

- Desktop (lg, ≥1024px): sidebar (`Sidebar.tsx`), content up to `max-w-5xl` from xl.
- Tablet (md): icon rail. Phone: bottom tab bar (`BottomNav.tsx`).
- The top bar takes one page action through `HeaderAction`. Detail and settings pages (outside
  the shell) use `DetailTopbar`.
- The admin time-travel tool (`TimeTravelControl`) lives in the chrome, never floating over content: a row at the bottom of the sidebar, an icon in the phone, detail and admin top bars.
- Pages can use more room on wide screens (two columns from `xl` where it helps),
  but single-column pages should stay readable: cap long text blocks around `max-w-3xl`.
