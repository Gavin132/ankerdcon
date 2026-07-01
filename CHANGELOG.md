# Changelog

All notable changes to Ankerd Con are documented here.

---

## [1.4.0] - 2026-06-25

### Features

- **Profile banner upload** — Users can now upload a banner image (JPEG, PNG, WebP, or GIF) from their profile settings. A drag-and-zoom crop modal lets users reposition and scale the image to fit the 3:1 banner aspect ratio before uploading. GIFs are uploaded as-is to preserve animation. Banners are stored on Supabase Storage CDN and capped at 8 MB. Uploaded banners appear in the profile header, the view-only profile card, and the user profile popup. Existing banners can be replaced or removed at any time.

- **Hub page redesign** — The Hub page has been fully redesigned with a SaaS dashboard aesthetic. It now features a personalised time-based greeting with the current user's avatar, a dark event card with countdown and participant stack, a 2×2 action grid with live counters for rides, meals, finances, and location, and an improved hotel room overview with stacked avatars grouped by room.

- **Calendar list/calendar toggle in Meer** — The upcoming events section in the Meer tab now combines the list view and the full calendar grid into a single component with a segmented toggle. Both views share the same height so switching between them produces a smooth opacity transition without layout shift. The list view includes pagination (5 events per page) with dot indicators and prev/next arrows.

- **NamePicker shows Discord avatars** — The name picker dropdown now displays each user's Discord profile picture (via `UserAvatar`) instead of a hardcoded initial with a colour block. Chips inside the picker also show the avatar.

- **NamePicker: show on type only** — The name picker dropdown no longer opens immediately on focus. It only appears once the user starts typing, keeping the UI clean for lists with many users.

- **NamePicker in transport modal driver field** — The ride creation modal's driver field has been replaced with `NamePicker`, making it consistent with all other name selectors in the app.

- **Public transport driver icon** — Ride cards for public transport routes now show a Train icon in the driver row instead of a `UserAvatar`, since "NS" is not a real user.

### Bug Fixes

- **Banner crop zoom drift** — Rapidly dragging the zoom slider caused the image to drift to a corner of the crop viewport. The root cause was a stale `zoom` state value being read inside `applyZoom` on each slider event before React had re-rendered. The current zoom is now tracked in a ref that is updated synchronously on every call, so position scaling is always relative to the correct previous zoom level.

---

## [1.3.0] - 2026-06-24

### Bug Fixes

- **Meal RSVP broken** — `rsvpMeal` in `meals.service.ts` referenced an undefined `api` variable instead of `apiClient`. All three meal mutations (`rsvpMeal`, `cancelRsvp`, `deleteMeal`) also still used `rowNumber: number` as the identifier, while the Supabase backend expects a UUID string. All three are now fixed.
- **Payments broken** — The `Payment` model in the backend still had `row_number: int` as its primary key field. Supabase returns `id` (UUID string). The backend model, frontend type, service, hook, `PaymentCard`, and `FinancePage` key prop were all updated to use `id: string`.
- **Restaurant rides non-functional** — `RestaurantCard` passed `rowNumber: ride.row_number` to all nine mutation calls, but `row_number` no longer exists on the `Ride` type (migrated to `id`) and the hooks expected a field named `id`, not `rowNumber`. All calls corrected to `id: ride.id`.
- **Hub page crew section never loaded** — `HubPage` called `useUser()` (a single-user hook requiring a name argument) instead of `useUsers()`. Because no name was passed, the query was permanently disabled and the crew section never populated.
- **ICS export broken** — `exportRideToIcs` and `exportMealToIcs` in `ics.ts` referenced `ride.row_number`, `meal.row_number`, and `meal.rsvps`, none of which exist on the migrated types. Updated to `ride.id`, `meal.id`, and `meal.participants`.
- **`RideTimeline` and other components** — Several components still used `ride.row_number` or `gap.rowNumber` as React list keys (`RideTimeline`, `RestaurantStatus`, `DailyActionCheck`, `ComputeRestaurantGap`). All corrected to use `id`.
- **Backend `IndentationError` on startup** — Removing the `row_number` field from `models/user.py` accidentally de-indented the `phone_number` field below it, causing a Python `IndentationError` that prevented the server from starting.

### Features

- **Allowlist (change #27)** — Only Discord users with an existing profile row in Supabase can access the app. After Discord OAuth validation, `get_current_user` in `dependencies.py` now queries the `profiles` table and returns `403 Toegang geweigerd` if no profile is found. To grant someone access, add them to the `profiles` table in Supabase.

- **Hotel room tile on Hub (change #28)** — When the active upcoming event has `is_hotel: true` and at least one user has a hotel room set in their profile, a "Hotelkamers" tile appears on the Hub page. Users are grouped by room number with their avatars shown alongside.

- **Automatic version number (change #29)** — The app version shown in the Meer tab is now sourced automatically from `frontend/package.json` at build time. `vite.config.ts` reads the version and exposes it as a global `__APP_VERSION__` constant (declared in `vite-env.d.ts`). To bump the version, update the `version` field in `package.json` — the Meer tab will reflect it on the next build without any manual edits to UI files.

- **UserAvatar used everywhere (change #22)** — All places that previously rendered avatars with hand-written `avatarColor()` + initial divs have been replaced with the `<UserAvatar />` component. This ensures custom profile colors set by users appear consistently across: `PaymentCard`, `RideTimeline`, `MorePage` crew strip and crew list, `HubPage` hero participant bubbles, and `RestaurantGapBlock`. The component was already in use in `CalendarGrid` and `CalendarArchive`.

- **Name picker in payment delete modal** — The raw `<select>` dropdown in the payment deletion confirmation modal has been replaced with the `NamePicker` component, making it consistent with every other name selector in the app (searchable, styled the same way).

- **UUID IDs for rides and calendar tables** — The `rides` and `calendar` Supabase tables previously used auto-incrementing integer primary keys. All backend route parameters (`ride_id`, `event_id`), Pydantic models, frontend TypeScript types (`Ride.id`, `CalendarEvent.id`, `CalendarEvent.event_group_id`, `RestaurantGap.id`), hooks, and services have been updated to treat these IDs as `string` (UUID) to be consistent with the `meals` and `payments` tables. The actual Supabase schema change (dropping the identity constraint and altering the column type to `uuid`) must be applied via the SQL editor.

### Code Cleanup (change #23)

- **Google Sheets completely removed** — The following files were deleted as they were dead code left over from the original Google Sheets integration:
  - `backend/app/core/sheets.py`
  - `backend/app/services/sheets_service.py`
  - `backend/app/routers/auth.py` (passcode-based login, never imported in `main.py`)
  - `backend/app/services/auth_service.py`
  - `backend/tests/` (entire test suite was built around Google Sheets mocks and no longer applied)
- **`requirements.txt` cleaned up** — Removed `gspread`, `google-auth`, and `pandas`, which were only needed for the Sheets integration.
- **`main.py` lifespan updated** — Startup no longer attempts to connect to Google Sheets. It now performs a lightweight Supabase connectivity check instead.
- **`config.py` cleaned up** — Removed the broken `google_service_account` property that referenced a non-existent settings field.
- **`models/user.py`** — Removed the stale `row_number` field.
- **`types/index.ts`** — Removed `row_number` from the `User` interface and `RestaurantGap` interface; cleaned up `// was row_number` comments.
- **Stale comments removed** — Leftover `// CHANGED: ride.row_number is now ride.id` and similar migration comments removed from `RideCard.tsx` and `MealCard.tsx`.

### Row Number → ID Migration (change #25)

All remaining `rowNumber` / `row_number` references across the frontend have been replaced with the correct Supabase `id` field:

| Area                                          | Before               | After        |
| --------------------------------------------- | -------------------- | ------------ |
| `FoodPage` list keys                          | `meal.row_number`    | `meal.id`    |
| `FinancePage` list keys                       | `payment.row_number` | `payment.id` |
| `usePayments` hook                            | `rowNumber: number`  | `id: string` |
| `useCalendar` hook                            | `rowNumber: number`  | `id: string` |
| `calendar.service.ts`                         | `rowNumber: number`  | `id: string` |
| `CalendarGrid` / `CalendarArchive` prop types | `id: number`         | `id: string` |
| `MorePage` calendar callbacks                 | `rowNumber`          | `id`         |

---

## [1.2.0] - 2026-06-22

### Features

- **Ride expiry states (change #1)** — Rides are now colour-coded based on departure time: urgent (red, <30 min), soon (orange, 30–120 min), recently departed (grayed out, 0–2h after departure), and fully expired (hidden). Expired rides are shown only in the history view.
- **Ride history button (change #1b)** — A history toggle on the Transport tab shows rides that departed more than 2 hours ago.
- **Timo truck easter egg (change #2)** — When the driver's name starts with "Timo", a truck icon replaces the car icon on their ride card.
- **Seat label updated (change #3)** — "Zitplaatsen" replaced with "Meerijders welkom" to make it clearer the count refers to available passenger spots, not total seats.
- **Upcoming event banner in Meer (change #4)** — The next upcoming event is always shown at the top of the Meer tab below the location ping button.
- **Expandable participants on Hub (change #6)** — The participant avatar strip on the hub hero card is now tappable and expands to show all participant names.
- **Searchable name dropdowns (change #7)** — All name dropdowns now use the `NamePicker` component, which supports typing to filter through names.
- **Seats field hidden for public transport (change #8)** — When "Openbaar Vervoer" is selected when creating a ride, the seat count field is hidden.
- **Restaurant rides (change #5)** — A dedicated "Restaurant" direction for organising transport to restaurant outings, with car availability and action-required flags.
- **Dark mode (change #11)** — User-controlled dark mode toggle in the Meer tab, persisted to `localStorage` via `useThemeStore`.
- **Chronological event ordering (change #12)** — Events in the Meer tab calendar are now sorted chronologically.
- **Calendar RSVP (change #13)** — Users can sign up to events directly from the Con Calendar in the Meer tab.
- **Past events hidden (change #14)** — Completed events are collapsed under a "Geschiedenis" section in the Meer tab.
- **Events grouped by Event ID (change #15)** — Calendar entries are grouped by their Event ID (e.g. HDCC2026Zomer) rather than listed individually.
- **Hub: future-only counters (change #17)** — The rides and meals counters on the Hub now only count upcoming items, not past ones.
- **Food: past meals collapsed (change #18)** — Completed meals are hidden under a collapsible history section.
- **Meals always expanded (change #20)** — Meal cards now start expanded by default.
- **Location ping tile (change #21)** — The Hub stat grid now features a prominent location ping button instead of a member counter.

### Fixes

- **Timezone handling (change #9)** — `formatDate()` now parses `DD-MM-YYYY` and `YYYY-MM-DD` date strings as local midnight to prevent off-by-one date display issues caused by UTC conversion.

---

## [1.1.0] - 2026-06-10

### Features

- **Supabase migration** — Database migrated from Google Sheets to Supabase (PostgreSQL). All read/write operations rewritten to use the Supabase client.
- **Discord OAuth login** — Authentication replaced with Discord OAuth via Supabase Auth. Users log in with their Discord account; their Discord display name is used as their in-app identity.
- **Profile customisation** — Users can set a custom avatar colour, profile banner colour, bio, pronouns, and display font from the profile page.

---
