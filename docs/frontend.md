# Frontend

The React app in `frontend/`. For how it looks see [design-system.md](design-system.md);
for what each screen does see [features.md](features.md).

- [Stack and build](#stack-and-build)
- [Folder map](#folder-map)
- [Routing](#routing)
- [The data layer](#the-data-layer)
- [State](#state)
- [Forms and validation](#forms-and-validation)
- [Sheets, modals and toasts](#sheets-modals-and-toasts)
- [Time, dates and time travel](#time-dates-and-time-travel)
- [Offline and updates](#offline-and-updates)
- [Conventions](#conventions)
- [Adding a feature](#adding-a-feature)

---

## Stack and build

React 18, TypeScript (`strict`, `noUnusedLocals`, `noUnusedParameters`), Vite 6,
Tailwind 3, Framer Motion, TanStack Query 5, Zustand, react-hook-form with Zod,
react-router 6, Leaflet, Recharts (admin only).

`npm run build` runs `tsc` and then Vite, and writes to **`../backend/dist`**, which the
backend serves. Build output is named with a hex content hash (`index-8998340c.js`); the
backend's cache headers and the service worker both recognise build files by that suffix,
so **do not change `hashCharacters`**. The service worker is emitted as `/sw.js` with a
per-build version so it always differs byte for byte.

React, Framer Motion, Supabase and TanStack Query get their own vendor chunks so an app
deploy does not invalidate their cache. Every page except the login page is lazy-loaded
(`lazyPage` in `router.tsx`), so the admin portal costs nothing on a member's first load.

`__APP_VERSION__` is injected at build time from `backend/VERSION`.

## Folder map

```
src/
├── App.tsx, main.tsx     Providers (query client with persistence), auth sync, banners
├── router.tsx            Route table, lazy pages
├── config/               env.ts, routes.ts (page URLs), api-routes.ts (API URLs)
├── constants/            QUERY_KEYS, STALE_TIME, design tokens, external URLs
├── pages/                One file per screen. pages/trip/ (the trip page and its tabs),
│                         pages/admin/, pages/onboarding/
├── components/           By area: trip, finance, hub, story, transport, food, meal, ride,
│                         cosplay, crew, profile, calendar, event, layout, auth, common
├── hooks/                One file per domain: useRides, useMeals, useExpenses, …
├── services/             One file per domain: the actual API calls
├── lib/api/client.ts     The axios client, ApiError, timeouts, token refresh
├── lib/queryPersist.ts   The persisted query cache
├── store/                Zustand: auth, theme, toasts, time travel, pending uploads
├── utils/                Pure helpers: trips, rides, dates, images, weather, ics, …
└── types/                Shared TypeScript types (mirror the API's models)
sw/service-worker.js      The service worker source
```

## Routing

`config/routes.ts` is the single list of page URLs (`routes.trip.view(id, "transport")`);
never write a path by hand. `router.tsx` wraps pages in `ProtectedRoute` (needs a
session, sends unfinished profiles to onboarding, shows "Geen toegang" or "Kan de server
niet bereiken") and `AdminRoute`. The main pages live inside `AppShell` (top bar, sidebar,
bottom tabs); settings, profile, ride and meal pages sit outside it with their own top bar
(`DetailTopbar`).

**Trips** are `/trips/:tripId`. The `?sheet=transport|rooms|cosplay` query parameter opens
that part as a sheet over the page, and `?day=` preselects a day. Both are query
parameters rather than path segments, so opening or closing a sheet never remounts the page
underneath or resets its scroll. Old URLs redirect (`config/routes.ts` → `legacy`).

## The data layer

Three layers, always in this order:

```
component ──► hook (hooks/useRides.ts) ──► service (services/rides.service.ts) ──► apiClient
```

- **Services** are plain async functions that call the API and return typed data.
- **Hooks** wrap them in `useQuery`/`useMutation` and own **cache keys** (`QUERY_KEYS` in
  `constants/`), invalidation and optimistic updates (claiming a seat updates the list
  immediately and rolls back on error).
- **Components** never call axios.

`STALE_TIME` is 30 seconds; queries refetch on window focus and reconnect. Query results
are **persisted** to `localStorage` for 24 hours, dropped when the app version changes, on
logout and when an admin impersonates someone (`lib/queryPersist.ts`), so the app opens on
the last known data.

`lib/api/client.ts` is the only place that knows about HTTP details:

- adds the Supabase token to each request;
- on a 401 refreshes the session once and replays the request, and if Supabase cannot be
  reached lets that one request fail instead of logging out;
- retries a 403 once (a brief database hiccup can fail the whitelist check);
- times out after 30 s (`REQUEST_TIMEOUT_MS`), uploads after 60 s (`UPLOAD_TIMEOUT_MS`);
- turns every failure into an `ApiError` with the server's Dutch message and a `status`
  (0 means no response at all, which is how "offline" looks).

## State

| Kind | Where |
| --- | --- |
| Server data | TanStack Query |
| Session, current user | `store/auth.store.ts` (Supabase session, forbidden flag, refresh) |
| Theme | `store/theme.store.ts` (light/dark, applied to `<html>` and the browser theme colour) |
| Toasts | `store/toast.store.ts`; call `toast("success", "…")` from anywhere |
| Time travel | `store/time.store.ts` (an admin-set fake "now") |
| Story uploads waiting for a connection | `store/pendingStoryUploads.store.ts`, mirrored in IndexedDB |
| Everything else | `useState` in the component that owns it |

## Forms and validation

react-hook-form with a Zod schema (`zodResolver`). Validation messages are Dutch. Anything
that changes something for other people asks for confirmation with the "arm, then confirm"
pattern (a first tap turns the button into "Zeker weten?") rather than `window.confirm`.
Forms in a sheet put their submit button in the sheet's `footer` and tie it to the form with
`form="…"`.

## Sheets, modals and toasts

- **`TripSheet`** (`components/trip/TripSheet.tsx`) is the standard way to open something
  over a page: a bottom sheet that grows with its content up to 85 % of the screen, with a
  title, optional back arrow (`onBack`) and footer. A sheet with several views (a list, a
  form, a filter) swaps them with `viewKey` inside **one** sheet instead of stacking
  another on top. It is used for Vervoer, Kamers, Cosplay, Weer, Praktisch, adding a meal,
  and the three finance screens.
- **`Modal`** is for small confirmations and pickers. **`UserProfilePopup`** anchors to what
  was tapped and scrolls inside itself.
- Full-screen viewers (story viewer, photo lightbox) are portals at `z-[500]`.
- **No floating buttons.** A page's main action lives in its content or the top bar
  (`HeaderAction`).

## Time, dates and time travel

Event dates are strings (`YYYY-MM-DD` or `DD-MM-YYYY`). Parse them with `parseEventDate`
(`utils/date.ts`), which builds a **local** date so the day never shifts with the time zone.
Anything that depends on the present (is a ride past, is a trip over, which event is
nearest) must call `getNow()` from `store/time.store.ts` instead of `new Date()`, so the admin
time-travel tool can test live and finished trips.

## Offline and updates

The service worker caches the app shell and hashed assets; `useServiceWorker` and
`UpdateBanner` offer "Nieuwe versie" when a new build is ready and reload only when the
member taps it, so nothing is lost mid-typing. Story photos that cannot be sent are queued
(`hooks/usePendingStoryUploads.ts`). The full picture is in
[architecture.md](architecture.md#working-on-bad-reception).

## Conventions

- **Dutch user-facing text**, English code. Errors say what went wrong and what to do.
- **Tokens, not colours.** Use `bg-surface`, `text-ink-2`, `border-line` so dark mode works
  by itself ([design-system.md](design-system.md)).
- **Names resolve through aliases.** A stored name may be a former name; look it up with
  `name`, `discord_username` or `aliases` (see `UserAvatar`, `TripParticipants`).
- **One source for URLs and keys:** `routes`, `apiRoutes`, `QUERY_KEYS`.
- **A profile link may carry an id or a name**; the backend accepts both.
- **Comments say why**, not what.

## Adding a feature

1. Backend first: model in `backend/app/models/`, router in `backend/app/routers/`, route
   paths in `backend/app/routes.py`, tests, and a migration if a table changes
   ([database.md](database.md)).
2. Frontend: type in `types/`, URL in `config/api-routes.ts`, function in `services/`, hook in
   `hooks/` (with a cache key), then the component. Put a new page in `pages/` and register it
   in `router.tsx` and `config/routes.ts`.
3. If it opens over a page, use `TripSheet`. If it is admin-only, add it to
   `pages/admin/constants.ts` (navigation) and the admin router group.
4. `npx tsc --noEmit`, `npm run build`, and the backend tests.
5. Update [api.md](api.md), [features.md](features.md) and `CHANGELOG.md`.
