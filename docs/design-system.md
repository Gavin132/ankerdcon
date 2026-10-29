# Design system

The look approved in September 2026 (see `docs/ui-proposal/ui-rework-proposal.html`):
calm and slightly raised (buttons, cards and filter controls sit on a thin plate edge), based on the Ankerd anchor mascot. Ink outlines, one blue brand fill (`#57B2F9`), status
colours only for status, calm screens.

The tokens live in `frontend/tailwind.config.ts` and `frontend/src/index.css`. To see the
components in use, look at `pages/trip/TripOverviewTab.tsx` and `components/trip/`.

## Rules

- **Slightly raised: buttons, cards and filter controls; everything else flat.** The plate is a thin light edge on top, a 1px darker edge below and a soft `0 1px 2px` shadow, built from the `--btn-*` tokens (`.btn-bevel`, `.card-surface`, `.chip-off`, the chosen `.segmented-item`). The chosen `.chip-on` is pressed in and the `.segmented` track is a well. Sheets, icon buttons, pills, notices and every other surface are flat: no gradients, no `backdrop-blur`, no glass, no soft card shadows, no
  glows or decorative blurred circles. Nothing lifts or scales on hover
  (`whileHover`, `hover:-translate-y`, `hover:scale`), and nothing shrinks when pressed
  (`active:scale-*`); the press feedback of a flat control is the dim in `index.css`. Hover changes a border or
  background colour only. The one exception is that plate (see Buttons), and a menu or popover keeps `shadow-xl` (`tailwind.config.ts` switches `shadow-sm`,
  `shadow` and `shadow-md` off, and there are no `shadow-card`, `shadow-hero` or `gradient-card-*` classes). The dotted
  cover pattern of a ticket is the one radial gradient left, and it is a pattern, not a fade.
- **One bold element per screen** gets the 2px ink outline (`border-2 border-outline`),
  for example the Hub ticket or a trip's headline block. Everything else uses the
  1.5px `border-line`. `border-2` is for exactly three things: a hero or ticket, a dialog
  (`ConfirmHost`) and a spinner or avatar ring (which are not boxes). Dividers are 1px (`h-px bg-line`,
  `divide-y`). A selected state is never a thicker outline: see Selected below.
- **Accent colour is a personal setting** (Instellingen → Accentkleur: blue, turquoise, green,
  gold, orange, pink, purple; per device). It only swaps the brand tokens (`--cyan`,
  `--cyan-soft`, `--cyan-text`, and `--selected` in dark mode) through `[data-accent]`
  blocks in `index.css`; paper, surface, ink and the status colours never change. So **use the
  brand tokens (`bg-brand`, `bg-brand-soft`, `text-brand-text`), not `sky-*`, for anything that
  means "the app's colour"** (spinners, links, selected states), or it stays blue for everyone
  who picked another accent. `sky-*` is for things that are blue on purpose. A new accent needs
  a fill, a tint and a text colour that is 4.5:1 on white, and their dark counterparts, and an
  entry in `ACCENTS` (`theme.store.ts`).
- **Blue (`#57B2F9`) is the brand fill**, for the main action and the one bold
  element. Text on the brand fill is ink (`text-brand-on`), never white. The fill is
  too light to use as text, so brand-coloured text and links use `text-brand-text`
  (`#0C69BB` light, `#89CAFE` dark).
- **No floating UI.** No floating action buttons and no sticky "add" bars over the
  content. A page's main action lives in its content (a header row above the list) or in
  the top bar (`HeaderAction`). Things that open over a page are sheets (see below).
- **Status colours are for status only:** `ok` (emerald) = ok/paid, `warn` (amber) = needs
  attention, `bad` (rose) = problem/destructive. Don't use violet, indigo, purple, blue or
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
| `border-outline` | the bold 2px outline of a hero, ticket or dialog (a button has no outline) |
| `bg-brand`, `text-brand-on` | brand blue fill with ink text |
| `bg-brand-soft`, `text-brand-text` | soft blue background, blue text/links |
| `bg-hatch-surface` | striped surface for travel days |
| `text-ok` / `text-warn` / `text-bad`, `bg-ok-soft` / `bg-warn-soft` / `bg-bad-soft` | status text and its tint (emerald / amber / rose); they switch in dark mode by themselves, so no `dark:` twin |
| `border-ok-line` / `-warn-line` / `-bad-line`, `bg-ok-fill` / `-warn-fill` / `-bad-fill`, `text-ok-on` / `-warn-on` / `-bad-on` | a notice's border, a solid dot, bar, banner or button, and the text on that solid fill |
| `bg-scrim/50` | the dark layer behind a sheet, dialog or viewer |
| `bg-selected`, `text-selected-on`, `text-selected-icon` | a chosen chip (`.chip-on`) and the active tab: the ink fill with paper text (the brand fill with ink text in dark mode), and the icon on it |
| `bg-hero`, `text-hero-ink`, `text-hero-warn`, `text-hero-bad`, `bg-hero-ink/10` | the always-dark hero panel and what sits on it (the same in both themes) |
| `bg-avatar-1` .. `bg-avatar-6`, `text-avatar-on` | the fill of an initial without a photo or colour of its own (picked by name), and the white initial |

**Every colour comes from a token** (the next section); `npm run check-colors` fails on a raw palette class.
`slate-*` and `sky-*` stay remapped in `tailwind.config.ts` (to the greys and the brand blue) but nothing in the
app uses them any more; the check counts them, and new code uses the tokens.

## Colours

All colours of the UI are CSS variables in `frontend/src/index.css` (`:root` for light, `.dark` for dark, channels
without `rgb()` so `bg-ink/10` works), exposed as Tailwind colours in `frontend/tailwind.config.ts`. A component
names the meaning (`text-bad`, `bg-warn-soft`), never a palette colour and never a `dark:` twin of one. A vitest test
(`src/styles.tokens.test.ts`) reads `index.css` and fails when a text colour is under 4.5:1 on the background it is
used on, in either theme; `npm run check-colors` (`frontend/scripts/check-colors.mjs`) fails on a raw palette class
(`bg-rose-100`, `text-white`, `from-violet-500` ...), a hex colour, an `rgb(1, 2, 3)` or a `dark:` class in `src`. Opacity of the faint anchor marks in the app corners is `opacity-watermark` (a variable that differs per theme, like a colour).

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `paper` | `#F5F8F9` | `#0D1216` | page background |
| `surface` | `#FFFFFF` | `#141B20` | cards, sheets, menus, inputs |
| `sunken` | `#EBF1F3` | `#10161A` | wells, hover rows, skeletons |
| `ink` / `ink-2` / `ink-3` | `#0F1519` / `#4A5A63` / `#606F77` | `#E6F0F3` / `#A0B0B8` / `#7D8D95` | primary, secondary, muted text and icons |
| `line` | `#D5DEE2` | `#243039` | borders and dividers |
| `outline` | `#0F1519` | `#BFD3DA` | the bold 2px outline |
| `brand` (+ `brand-on`) | `#57B2F9` (ink) | same | the one fill, with its text; follows the accent colour |
| `brand-soft` / `brand-text` | `#DCEEFB` / `#0C69BB` | `#0F2A40` / `#89CAFE` | tint, and brand-coloured text and links |
| `ok` / `ok-soft` / `ok-line` | `#047857` / `#D1FAE5` / `#A7F3D0` | `#6EE7B7` / `#13332F` / `#1D5244` | done, paid, received: text, tint, border |
| `ok-fill` / `ok-on` | `#10B981` / `#0F1519` | same | solid dot or bar, and text on it |
| `warn` / `warn-soft` / `warn-line` | `#92400E` / `#FEF3C7` / `#FCD34D` | `#FCD34D` / `#362F1D` / `#58421A` | needs attention, waiting |
| `warn-fill` / `warn-on` | `#FBBF24` / `#0F1519` | same | banner, solid dot or badge, and text on it |
| `bad` / `bad-soft` / `bad-line` | `#BE123C` / `#FFE4E6` / `#FDA4AF` | `#FDA4AF` / `#362029` / `#703D48` | problem, you owe, destructive |
| `bad-fill` / `bad-on` | `#E11D48` / `#FFFFFF` | same | the danger button, error banner and toast, solid bar, and text on it |
| `selected` / `selected-on` / `selected-icon` | `#0F1519` / `#F5F8F9` / the accent | `#57B2F9` (the accent) / `#0F1519` / `#0F1519` | a chosen chip and the active tab, so no `dark:` twin is needed; the icon on it is the accent on ink in light, ink on the accent in dark |
| `hero` / `hero-ink` | `#0F1519` / `#E6F0F3` | same | the always-dark hero panel and its text |
| `hero-warn` / `hero-bad` | `#FDE68A` / `#FECDD3` | same | warn and bad chip text on the hero |
| `scrim` | `#080C0F` | same | `bg-scrim/50` behind sheets and viewers; a caption on a photo |
| `avatar-1` .. `avatar-6` (+ `avatar-on`) | `#0D75D1` `#047857` `#B45309` `#BE123C` `#4A5A63` `#A21CAF` (white) | same | fill of an initial without a photo or colour of its own |

Which token: pills and chips are `.pill-ok|warn|bad`, a bordered message is `.notice-ok|warn|bad`, an icon square is
`.icon-tile-ok|warn|bad`, the destructive buttons are `<Button variant="danger">` / `.btn-danger`. There is no "info" colour: a
neutral message is `bg-sunken text-ink-2` and the app's own colour is `brand`. Categories (event types, meal types,
ride directions) are told apart by words and icons, not by colour.

**Stays hard-coded** (each is in `ALLOWED` in `scripts/check-colors.mjs` with its reason; add a line there, not a
workaround): colours members choose and that are stored as data (`NAME_COLORS`, `BANNER_COLORS`, the colour picker's
starting value; event-group and badge colours come from the database); the swatches of the accent picker
(`ACCENTS` in `theme.store.ts`); brand marks of third parties (the Google logo in `LoginForm`); the `theme-color`
meta tag, the splash screen and the manifest (the browser needs a literal); canvas code (`videoPoster.ts`); the map
pins and the story viewer's drag fade (Leaflet HTML and framer-motion need literal values); the QR code on the
Instellingen page (black on white, to scan); `src/dev/` and tests. The places in `index.css` that keep a literal outside
the token blocks are the checkmark SVGs of the checkbox (data URIs cannot read variables) and, between `colours:allowed` markers, the dark map-tile background.

**Names the user picks are not trusted on either theme.** A stored name colour is only a preference, and a dark
purple vanishes on the dark page. `readableNameColor(color, isDark)` (`utils/profile.ts`) gives the colour back
unchanged when it has 4.5:1 against the page, and otherwise the same hue moved lighter or darker; use it wherever a
member's colour is drawn as *text*. As a background (an avatar) the colour is used as picked, with white initials.

**Adding a colour:** first look whether `ok`, `warn`, `bad`, `brand` or `ink` already means it. If a new one is
needed, add the channels to `:root` and `.dark` in `index.css` (a pair for text and tint, 4.5:1), name it in
`tailwind.config.ts`, add its pairs to `src/styles.tokens.test.ts`, put a row in the table above, and use the class
in components. A new *accent colour* for the personal setting is a `[data-accent]` block (see Rules).

## Type

Two typefaces, loaded from Google Fonts in `index.html`: **Poppins** for everything, and
**Big Shoulders Display** (a condensed face) for the big things only.

| Class | Renders as | Use |
| --- | --- | --- |
| `font-display font-extrabold uppercase leading-[0.95]` | Big Shoulders Display | page and hero titles, event names, big numbers (countdowns, room numbers, day numbers). 34–42px page titles, 22–26px section/card titles. |
| `font-sans` (default) | Poppins | all UI and body text. Headings inside cards: `font-semibold`. Avoid `font-black` on Poppins (it is mapped one step lighter). |
| `font-mono` | **Poppins** | times, dates, amounts (`tabular-nums`), and small labels. The class name is kept from when this was a monospaced face; it now only says "this is a label or a figure". |
| `section-label` | Poppins 12px semibold, uppercase, tracked | the label above a group ("Voor jou") |
| `label-quiet` | Poppins 12px medium, uppercase, tracked less | a kicker above a title, a table header (`th`), the column heads of a calendar |

Small **subtext under a title or on a card** (a hint, a status line, "Naar hotel · nu") is
plain Poppins in the text's own capitalisation: no `uppercase`, no letter-spacing. **Uppercase mono exists in exactly
four forms:** `.section-label`, `.label-quiet`, `.tag` and a chip (`.chip`, `HeroChip`, `.pill`'s cousins). Nothing
writes `uppercase tracking-[…]` by hand; if a line of text is not one of the four, it is sentence case. The display
face's `uppercase` (titles, big numbers) is a different thing.

**Data is sentence case, labels are uppercase.** A date, a count or a name that is *content* ("di 17 · do 19 nov",
"Di" above a day number, the date line of a cosplay, "1 van 2 bezet") is written the way you would say it. Only a
label that names a group or a field is uppercase mono. So the day tiles on the Hub, the day cards of a trip and the
date line of a cosplay card all read "Di", "Wo" and "di 17 · do 19 nov".

**Nothing the member has to read is smaller than 12px**, with no exception for tags, table headers, kickers, the
sidebar wristband or the tab bar (a label that does not fit is shortened, not shrunk). Use `text-xs` (12px) as the
floor. Smaller is only for the initials inside an avatar circle (`UserAvatar`, `AvatarStack`), which are part of the
picture; a count in a circle (a filter badge) is 12px in a circle that grows to fit it. Sizes in use: 12 (`text-xs`:
labels, chips, hints), 13 and 14 (rows, body), 15 and 16 (lead text, inputs), then the display sizes. The half sizes
(12.5, 13.5, 14.5) are left over from older screens; do not add new ones. The layout check reports text under 12px
(`small-text`); `npm run mobile-audit -- --info` lists it.

## Icons

Lucide icons, the `size` prop in whole pixels, one scale: **12, 14, 16, 20, 22, 24 and up**. Nothing is smaller than 12
and there is no 9, 10, 11, 13, 15, 17, 18 or 19.

| Size | Role |
| --- | --- |
| 12 | beside 12px text: in a pill, a tag, a hero chip, a meta line; the tick in a tiny filter badge |
| 14 | in a chip, in a control under 36 px (the little edit and delete buttons on a photo, the clear button of a field), in a `size="sm"` button |
| 16 | **the default**: in a button, a row, a list, the top bar, an `icon-btn` (36 px), a "go on" chevron at the end of a row |
| 20 | the tab bar and the icon rail of the sidebar, the heading icon of a dialog |
| 22 | the icon of an `EmptyState` |
| 24 and up | a status screen or a hero (`StatusScreen`, the empty calendar) |

The same icon keeps the same size in the same role: delete and edit are 16 in an `icon-btn` and in a row, 14 in a
control under 36 px, 12 inside a chip. A spinner replaces the icon it stands for, at that icon's size (`Loader2`).
Compact density does not change icon sizes. Avatar initials are text, not icons, and keep their own sizes.

## Shape: radius and borders

One radius scale, named in `tailwind.config.ts` (`borderRadius`). Note that `xl` is 10px and `2xl` is 12px in this
project, not Tailwind's 12 and 16:

| Class | px | Use |
| --- | --- | --- |
| `rounded-sm` | 2 | tiny marks: a legend swatch, the dots in the month strip |
| `rounded-md` | 6 | tags, skeleton bars, small thumbnails |
| `rounded-lg` | 8 | an icon button, an icon square, a day tile, a chosen item in a segmented control |
| `rounded-xl` | 10 | controls: buttons, inputs, notices, the segmented track, tab bar items |
| `rounded-2xl` | 12 | containers: `card-surface`, menus and popovers, dialogs, skeletons of a card |
| `rounded-hero` | 14 | hero blocks and tickets (the one bold element of a screen) |
| `rounded-t-sheet` | 20 | the top corners of a bottom sheet (`TripSheet`) |
| `rounded-full` | | pills, chips, avatars, dots, switches |

No `rounded-[…px]`: if a shape does not fit the scale, the scale is wrong, not the shape. A bordered white box that is a
container is `card-surface` (12px), not `rounded-xl border-1.5 border-line bg-surface` (10px). The checkbox (`.cb`) is
4px. A hand-written radius next to a component that has one (`.input-field`, `.card-surface`) is a bug: let the class
decide.

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
<p className="label-quiet">Kicker · context</p>
<h1 className="mt-1 font-display text-[34px] font-extrabold uppercase leading-[0.95] text-ink md:text-[42px]">Title</h1>
```

## Components and patterns

- **Panel / card:** `card-surface` (surface, 1.5px line border, 12px radius) with
  `overflow-hidden`. Clickable: `card-surface-hover` (border darkens on hover).
- **Panel header:** `section-label` on the left, an optional `text-[12.5px] font-semibold text-brand-text` link on the right.
- **List rows inside a panel:** `divide-y divide-line` or `border-t border-line`, row hover `hover:bg-sunken`.
- **Icon square: all or none.** Use it only where every item of the same list or grid has one (the tiles on the Event page, the rows in Instellingen); a heading with an icon next to a heading without one reads as a mistake, and the square pushes the text in. Inside a sheet (Hotel, Praktisch) the headings have no icon. `flex h-8 w-8 items-center justify-center rounded-lg bg-sunken text-ink`; status versions are `icon-tile-ok`, `icon-tile-warn` and `icon-tile-bad` (colours and shape; add the size, `h-8 w-8`).
- **Pill (status):** `.pill` plus `.pill-ok|warn|bad|neutral` (12px semibold, `rounded-full`, `px-2 py-0.5`); add only `gap-1.5`, `shrink-0` or `font-mono tabular-nums`. Never rebuild it with `rounded-full px-2 py-0.5 text-xs font-semibold`.
- **Tag:** `tag` (`rounded-md border border-line px-1.5`, small uppercase label, 12px). A chip is the filter pill below.
- **One blue button per view.** The main action of a screen or sheet is `btn-primary`; the same action repeated in each section of a list ("Rit aanbieden" for Heen and for Terug) is `btn-secondary`, so the eye has one place to go.
- **Buttons:** one family in five tiers, defined once in `index.css` (`.btn-*`) and used by `<Button variant="...">` and by a raw `<button className="btn-secondary px-4 text-sm">` alike. Hover does not move or scale a button. **Buttons, and only buttons, are a slightly raised plate** (`.btn-bevel`, built into `primary`, `secondary`, `tonal` and `danger`): a 1px light edge on top (`--btn-edge`), a 1px darker edge below as the thickness of the plate (`--btn-shade`) and a soft `0 1px 2px` shadow round it (`--btn-shadow`), each a colour channel plus an opacity (`--btn-edge-a`, `--btn-shade-a`, `--btn-shadow-a`) that differ per theme: light mode a clear white edge and a gentle shadow, dark mode a fainter edge and a deeper shade; kept subtle on purpose, the grey tiers looked over the top when stronger. The shade is black or ink over the button's own fill, so it is a darker version of any fill, also the pale brand blue where a white edge hardly shows. Ghost, `danger-soft`, `.icon-btn`, chips, segmented controls, cards and sheets stay flat; do not add a bevel to them. A hand-made button gets it with the `btn-bevel` class (the hero buttons do, together with `btn-on-hero`, which pins the dark-theme values because the hero is dark in both themes). Every tier is `rounded-xl` (10 px), bold, 44 px tall (`hit-area` on one made smaller) and at least 12 px text:
  - `primary` / `.btn-primary`: solid `bg-brand` with `text-brand-on`, no border. The one main action of a view.
  - `secondary` / `.btn-secondary`: transparent with a 1px `border-line` hairline and an ink label. Every other action.
  - `tonal` / `.btn-tonal`: `bg-surface` with the same hairline, a lifted fill for a neutral action that needs more body than the outlined one ("Inloggen met Google"; an icon first, then the label). It lifts off the page (`bg-paper`), not off a card, so put it on the page or a `bg-paper` panel (the login panel is one).
  - `ghost` / `.btn-ghost`: no fill, no border, `text-ink-2`; the quiet "Terug" or "Annuleren" that is not paired with a destructive confirm.
  - `danger` / `.btn-danger`: solid `bg-bad-fill text-bad-on`, the confirm of a destructive action. `.btn-danger-soft` (red text on `bg-bad-soft`) is the quiet one that only opens the question. A confirm pairs `secondary` "Annuleren" with `danger`.
  - **States, the same for every tier:** hover is a small shift (primary and danger fade to 90%, the outlined tiers darken the border to `border-ink-3` and take a faint `bg-sunken`, ghost takes `bg-sunken`); pressed sinks into the page (the edges and the shadow go, an inset shade appears, the button moves 1px down and dims to 80%); keyboard focus is the `ring-brand-text` ring with an offset; disabled is flat grey (`bg-sunken text-ink-3`, no outline, no bevel, `cursor-not-allowed`; the ghost only loses its text colour); loading (`<Button loading>`) puts a spinner over the label, which stays in place hidden, so the width does not change.
  - **Icon-only buttons** are `.icon-btn` (36 px square, `rounded-lg`, 44 px to hit, `text-ink-2`, hover `bg-sunken`; add only a position or a hover colour such as `hover:text-bad`). Never rebuild one with `hit-area flex h-8 w-8 ...`. On an image or the dark hero the control is a translucent hero chip and stays hand-made.
  - **`OrDivider`** (`components/common/OrDivider.tsx`, `<OrDivider label="of ga verder met" />`): a hairline with a centred label between two groups of actions, as on the login page between Discord and Google. On/off settings use `components/common/Switch.tsx`, and a row with a name and a hint in a sheet is `components/common/ToggleRow.tsx` (the admin sheets and the meal sheets alike). Shared classes in `index.css`: `.pill` + `.pill-ok|warn|bad|neutral` (status: fine / waiting for you / you owe / info), `.chip` + `.chip-on|off` (filters), `.notice-warn` / `.notice-ok` (a bordered message block), `.icon-btn`, `.field-label` and `.field-error` (forms), `.stack-table` with `cell-main` and `cell-actions` (a data table that becomes cards on a phone: the name cell takes what is left of the line and may shrink, the actions never shrink; a `ConfirmInline` in the actions cell takes a line of its own), `.btn-danger` (the red confirm, same as `<Button variant="danger">`) and `.btn-danger-soft` (the quiet red one that opens the question). Popups are `TripSheet` (`Modal` is a thin wrapper around it). A control under 44 px gets `hit-area`.
- **Segmented control:** `<Segmented options value onChange label>` (`components/common/Segmented.tsx`, styled by `.segmented` and `.segmented-item` in `index.css`): a sunken track and the chosen item as a surface with the ink outline, 36 px to look at and 44 px to hit. `fill` shares the full width between the items (a sheet), `scroll` lets a long row (years) scroll sideways. Used for Tickets/Recap, the recap filter, the years of the collected stubs, Heen/Terug in the quick-ride sheet, the split mode of an expense, and in the admin panel Aankomend/Geschiedenis (Evenementen) and the file kinds (CDN). Never paste the classes into a screen.
- **Pager:** `<Pager count index onChange dotLabel prevLabel nextLabel>` (`components/common/Pager.tsx`): the dots (44 px to hit, the active one a bar) and the two arrows (`icon-btn`) under a row of cards you page through, on the Hub and in the Agenda stack. `arrowsFrom="md"` hides the arrows on a phone, where you swipe. A pager never moves by itself: a carousel on a timer fails people who need longer to read, and the design is calm.
- **Avatar stack:** `<AvatarStack names size max>` (`components/common/AvatarStack.tsx`): the overlapping faces of a list of stored names with "+N" for the rest. It counts *people* through `groupPeople`, so one person under two names shows once. Sizes `xs` (20 px), `sm` (24), `md` (28); `ringClass` matches the background it sits on. Default `max` is 5. `onDark` is for the always-dark hero (ring in the hero colour, a light "+N").
- **Finance row:** `<FinanceRow lead title sub amount tone pill onClick>` (`components/finance/FinanceRow.tsx`): one line of money on the Financiën page (Afrekenen, Ritkosten). The amount takes `text-bad` when you pay and `text-ok` when you receive, so the direction needs no pill; a `pill` is only for what the member has to do or wait for. A row that opens something gets a chevron.
- **Status screen:** `<StatusScreen mark title actions details statusLink topmost>` (`components/common/StatusScreen.tsx`): the screens that replace the app (404, no access, server unreachable, a crash). The logo *or* an icon square (never both), a 42 px title, the text, the buttons straight under it, then the joke, and the technical message behind "Technische details". Build a new one from it, not from scratch.
- **Colour dots:** `<ColorSwatch value onChange presets customFallback>` (`components/profile/ColorSwatch.tsx`): "automatic" (a slash), the presets and an optional own colour, 36 px with 10 px between. The name colours and banner colours are in `utils/profile.ts`; near-black and lime are left out of the name colours because they vanish on one of the two themes.
- **A settings page saves in the top bar:** `Opslaan` in the `DetailTopbar` `actions`, `disabled={!isDirty}` so it is only blue when something changed, plus one line saying what is saved at once (the photo and banner on the profile, the channel on Meldingen). A yes/no setting is a `Switch` row, not a checkbox.
- **Seat picker:** `<SeatPicker value onChange>` (`components/common/SeatPicker.tsx`): one row of 2 to 7 chips, "Incl. jezelf", in every sheet that asks how many seats a car has.
- **Selected state, two forms.** A **chip** (a short word you pick: filters, days, seat counts, a kind of feedback) is
  `chip chip-on` (the ink fill; in dark mode the brand fill) against `chip chip-off`. A **tile** (a box with content:
  the day tiles, a sort option, a driver to choose, a font or an avatar) keeps its 1.5px border and turns
  `border-outline bg-brand-soft`; a day tile also gets the tick circle. A group where several can be on at once
  (the flags of a meal category) is a chip with `bg-brand-soft text-brand-text` and a tick. Never `border-2`, never a
  brand fill with an outline for a choice (the brand fill is the one main button).
- **Inputs:** `input-field` for every text field, select and textarea, and nothing else sets its size: 16px text (`text-base`, on every screen size, so iOS never zooms), `px-4 py-3` (a 48px tall field), 10px radius (`rounded-xl`), 1.5px `border-line`, the brand-text border on focus. A field in a sheet, in the admin panel or beside a button is the same field: add only layout (`w-full`, `min-w-0 flex-1`, `!w-auto` for a select in a filter row) and the padding for an icon inside it (`pl-9`). A field made of an icon and a bare `<input>` in a wrapper (the search, the quick-ride time) is `h-11` with `text-base`. Never `text-sm` or `text-xs` on a field, never a different radius. Labels are `field-label` (12.5px semibold), messages `field-error`.
- **Hero blocks** (event, ride, meal headers): a flat ink block (`bg-hero text-hero-ink`, tokens that stay dark in light mode too,
  rounded 14px, `border-2 border-outline`) or the event image with a flat dark overlay
  (`bg-hero/60`, no gradient ramps). Title in the display face. White-ish chips are `HeroChip`
  (`components/common/HeroActions.tsx`, tones neutral / warn / bad; `heroChipClass()` when the chip is a link). The
  actions on it are `HeroActions` with a `HeroSecondaryButton` (the secondary tier on the dark block: transparent, 1px `border-hero-ink/25`, a faint `bg-hero-ink/10` on hover) and the one `HeroPrimaryButton` (`btn-primary`, no outline), both raised like every button (`btn-bevel btn-on-hero`) and 40 px
  tall (`MealHero`, `RideHero`). The row at the bottom with the faces of who is on the list, their count and the
  actions is `HeroPeople` (`components/common/HeroPeople.tsx`: tap for the names, tap a name for the profile popup).
  A hero has **one** blue button and at most **one** status chip (urgent, then soon, then action required); text on
  it is `text-hero-ink/75` or stronger. The warn and bad chip tones are `text-hero-warn` / `text-hero-bad` because the
  panel is dark in both themes (the `text-warn` tokens switch with the theme and would be dark on dark). The facts of an
  activity (when, where, price) are plain icon lines, not chips; chips are for status. A page with a hero
  has no second heading: its `DetailTopbar` gets `plainTitle` and the kind of page ("Activiteit", "Rit").
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
  `shadow-xl` (floating layers and buttons are the only things with a shadow). Backdrop `bg-scrim/50`, no blur.
- **Empty states:** `<EmptyState icon title description action>` (`components/common/EmptyState.tsx`), always: an `h-12 w-12 rounded-xl bg-sunken text-ink-3` icon square (the icon at 22), a `text-sm font-semibold text-ink` title without a full stop, an optional `text-xs text-ink-3` line and one action. A whole page or list is the plain one (`py-16`); inside a card, a sheet or a table cell it is `compact` (`py-8`), and in a table it sits in `<td colSpan={n}>` with no padding of its own (the cell brings none, also on a phone). Never write the icon square and the sentence by hand. A one-line hint inside a row ("Nog geen meerijders") is text, not an empty state.
- **Asking before a delete:** a delete that takes other things with it (a day, a selection of rows) goes through `askConfirm` (`store/confirm.store.ts`, shown by `ConfirmHost`): a dialog with "Annuleren" and a red "Verwijderen" (`destructive: true`). Taking one row out of a list inside a card or table uses the two-step `ConfirmInline` (`pages/admin/components/`): the question, "Annuleren", the red confirm, all 44 px tall.
- **Loading:** three situations, one answer each. (1) A **page or list waiting for its data** shows a skeleton in the shape of its content: `bg-sunken animate-pulse`, text bars `rounded-md`, blocks `rounded-xl`, a hero `rounded-hero` (`Skeleton.tsx` has `HubSkeleton` and `DetailSkeleton`; the admin pages use `AdminTableSkeleton` and the page outline of `AdminLayout`). (2) A **button or row that is working** swaps its icon for `<Loader2 size={16} className="animate-spin" />` (14 in a control under 36 px) and says "Bezig…" or what it does ("Opslaan…"); `Button` has its own `loading`. (3) **The app starting** (a route chunk, the sign-in check) is `<LoadingSpinner>`, brand coloured (`onDark` on the dark hero background). Never a hand-made `border-2 border-t-transparent animate-spin` circle. The ellipsis is the one character "…", never three dots.
- **Admin page frame:** `<AdminPage width="wide|narrow">` (`pages/admin/components/AdminPage.tsx`) is the frame of every admin page: `space-y-5`, `px-4 py-5 sm:px-6 sm:py-8 lg:px-10`, `max-w-6xl` for a list or table (`wide`) and `max-w-3xl` for a form or a test tool (`narrow`). The title block is `AdminPageHeader`; its `action` takes a fragment of buttons that share the width on a phone. The loading state of a page (`AdminLayout`) is the outline of a page, not a spinner.
- **Tables (admin):** the class strings in `pages/admin/styles.ts`: `TH` (header cell, `th`: 12 px `label-quiet`), `TD` (cell, `px-5 py-3.5`; the `<tbody>` carries `divide-y divide-line`), `TR` / `TR_SELECTED` (row, hover or the tinted ticked row), `TAG`, `PILL_*`. Amounts are right-aligned `font-mono tabular-nums`. The checkbox of a row is `RowCheckbox` (16 px to look at, 44 px to hit). The actions for the selected rows (`AdminBulkBar`) are a strip in the page right above the table, never a bar floating over it. The edit and delete buttons at the end of a row are `DeleteConfirmActions` (`icon-btn`s, 44 px pitch; pass `editLabel` / `deleteLabel` naming the row); "delete" turns into `ConfirmInline` in place.
- **A table on a phone is two lines per row** (`.stack-table`): the name (`cell-main`) and the buttons (`cell-actions`) on the first line, and *one* line of facts under the name (date, place, price) that is `sm:hidden`. Every other column is `hidden sm:table-cell`, header included. Never leave several columns visible on a phone: the name cell is `flex: 1 1 0`, so it is squeezed to a few letters by whatever else is in the row. Show a pill only for what is not normal (a plain member has no pill, Gebruikers shows Admin, Kijker, Inactief).
- **A block of fields in an admin sheet** is `AdminSection` (`pages/admin/components/AdminSection.tsx`, `SECTION` in `styles.ts`): a `section-label` title and the fields, a divider between blocks, no card inside the sheet. `collapsible` folds a rarely used block behind its title (`<details>`; Evenement: "Tickets & links" and "Praktische info" start closed for an existing event). Yes/no fields in a sheet are `ToggleRow` (`components/common/ToggleRow.tsx`, a `Switch`), not a checkbox; a checkbox that has to stay (the "Con" of a day) is a `CHECK_ROW` line, 44 px tall. The footer is `DrawerFooter` (`submitLabel`, `disabled`): the main button says "Opslaan" for an edit and "Toevoegen" for a new one; "Plaatsen" only when the text goes live (an announcement or changelog item).
- **Quiet uppercase label:** `label-quiet` (12px, medium weight) for the kicker above a title and for table headers; `section-label` (semibold) for the label above a group. Put the colour next to it when the surface is not the page (`label-quiet text-hero-ink/70` on the hero, `section-label text-warn` in a warning).
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
- **A text field is 16px or bigger** (`input-field` is `text-base` at every width); below that iOS zooms the page in when
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
