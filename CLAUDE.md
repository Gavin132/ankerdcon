# Ankerd Con — Notes for Claude

Private event app (FastAPI + React + Supabase + MinIO). The docs in `docs/` are the
source of truth for how things work; start at `docs/README.md`. This file is only what
is easy to get wrong.

## Events: trip, day, series — do NOT confuse them

- A **trip** is one `events` row. Its **days** are `event_days` rows. The API flattens
  them to one `CalendarEvent` per **day**; `id` is the day's id, and `multi_day_id` is the
  parent event's id, set only when the trip has more than one day. The frontend's
  `tripIdOf(day)` is `multi_day_id || id`.
- Rides, meals, cosplays, expenses and photos link to a **day** id. Hotel rooms belong to
  the parent event. RSVPs and shared logistics (description, location, tickets, practical
  info, hotel rooms) are per trip, so use the trip (`multi_day_id`), never `event_group_id`.
- `event_group_id` is only a **series label** ("HDCC", from the `event_groups` table, stored
  as the group *name*). Events in one group are independent: separate RSVPs, participants
  and pages. It is for filtering and colouring in the admin panel.
- The old `calendar` table is legacy (dropped by migration v2.19).

## Working rules

- **The backend decides everything.** Permissions are enforced in routers and
  `app/dependencies.py` (`get_current_user`, `get_admin_user`, `act_as`,
  `require_owner_or_admin`). The frontend only mirrors them. Browsers never talk to the
  database or storage.
- **User-facing text is Dutch**, code and docs are English. Errors say what went wrong and
  what to do.
- **Frontend layers:** component → hook (`hooks/`) → service (`services/`) → `apiClient`.
  Keys and URLs come from `QUERY_KEYS`, `apiRoutes`, `routes`; never hand-write them.
- **Anything that depends on "now" uses `getNow()`** (`store/time.store.ts`), not
  `new Date()`, so admin time travel works.
- **Names are stored, not ids, in most arrays**; resolve a stored name through `name`,
  `discord_username` and `aliases`.
- **Design:** flat, tokens not colours (`bg-surface`, `text-ink-2`), no floating buttons, no
  shadows on cards, things that open over a page are a `TripSheet`. `font-display` is
  Big Shoulders Display for big titles and numbers; everything else, including `font-mono`
  labels, is Poppins. Details in `docs/design-system.md`.
- **Uploads** go through the backend into the one MinIO bucket under a random name and are
  never overwritten, which is why they can be cached as immutable.
- **Payment links** may only point at the providers in `PAYMENT_LINK_DOMAINS`
  (`app/services/settle_up.py`). Bank details are never stored on a profile.
- **`backend/app/routers/payments.py` is dead code**, deliberately not mounted.

## Before you finish a change

- Backend: `cd backend && python -m pytest`. Add a test for a bug you fix.
- Frontend: `cd frontend && npx tsc --noEmit && npm run build`.
- **Restart the backend and the frontend dev server** after changing them: `--reload` misses
  changes on Windows and Tailwind config is not hot-reloaded. Make sure only one process
  listens on port 8000.
- A new migration is run by hand, so say in its header whether it goes before or after the
  deploy, and add it to `TODO.md` until it has been run (`docs/database.md`).
- Update the docs that describe what you changed (`docs/README.md` has the table), and
  `CHANGELOG.md` for anything a member can see.
- Test throwaway pages and files (a page that renders a component with fake data) must not be
  committed; delete them.

## Commits

Work happens on `development`; `main` is the released state and is updated by pull request.
Small, focused commits with a body that says *why*. Never commit `.env` files or secrets.
