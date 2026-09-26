# Architecture

How Ankerd Con is put together, and why. For the reference details see
[api.md](api.md), [database.md](database.md) and [frontend.md](frontend.md).

- [The big picture](#the-big-picture)
- [One backend in front of everything](#one-backend-in-front-of-everything)
- [The data model](#the-data-model)
- [How a request is authenticated](#how-a-request-is-authenticated)
- [Files and photos](#files-and-photos)
- [Background jobs and notifications](#background-jobs-and-notifications)
- [Working on bad reception](#working-on-bad-reception)
- [Design decisions worth knowing](#design-decisions-worth-knowing)

---

## The big picture

```
                    ┌────────────────────────────────────────────┐
   phone / laptop   │  Browser: React PWA + service worker       │
                    │  TanStack Query cache (persisted)          │
                    └───────┬─────────────────────┬──────────────┘
                            │ HTTPS               │ HTTPS (login only,
                            │ /api/*, static      │ weather, place search)
                            ▼                     ▼
                    ┌───────────────┐      ┌──────────────┐   ┌─────────────┐
                    │  Cloudflare   │      │ Supabase Auth│   │ Open-Meteo  │
                    └───────┬───────┘      └──────┬───────┘   │ Nominatim   │
                            │ (home server)       │           └─────────────┘
                            ▼                     │ public key set
                    ┌───────────────────────────┐ │
                    │  FastAPI backend          │◄┘
                    │  + serves the built React │
                    │  app from backend/dist    │
                    └───┬──────────┬────────┬───┘
                        │          │        │
          service role  │          │ S3 API │ bot / webhook
                        ▼          ▼        ▼
                 ┌───────────┐ ┌────────┐ ┌────────────┐
                 │ Supabase  │ │ MinIO  │ │ Discord    │
                 │ Postgres  │ │ (CDN)  │ │            │
                 └───────────┘ └────────┘ └────────────┘
```

- The **browser** is a single-page React app. It talks to the backend for
  everything except logging in (Supabase Auth), weather (Open-Meteo) and place
  search (Nominatim), which it calls directly.
- The **backend** is one FastAPI process. It is the only thing that talks to the
  database, to MinIO and to Discord. In production it also serves the built
  frontend, so the whole app is one container.
- **Supabase** provides Postgres and the login service. **MinIO** stores every
  uploaded image and is reached by browsers through `cdn.ankerd.org`.

## One backend in front of everything

Browsers never query the database or storage directly. Migration
`v2.22_lock_down_direct_access.sql` removed that path: anyone with a Discord or
Google account can sign in to the Supabase project, so letting a signed-in
browser talk to Postgres would bypass the whitelist. Instead:

- the backend uses Supabase's **secret (service-role) key** and enforces every
  rule itself (who may see, change or delete what);
- row-level security is on for every table with no policies, so a leaked
  publishable key reaches nothing;
- uploads go browser → backend → MinIO. The backend re-encodes each image
  (Pillow) so a file is never stored as sent, and holds the storage keys.

The consequence for development: a permission is a line of Python in a router or
in `app/dependencies.py`, and the frontend merely mirrors it to avoid offering
buttons that would be refused.

## The data model

The one concept that needs explaining is the **trip**.

```
events           one row per trip      "HDCC 2026 Winter"
  └── event_days one row per day       21 nov, 22 nov, 23 nov   (participants live here)
```

- A **trip** is one `events` row (name, location, tickets, practical info, hotel).
  Its **days** are `event_days` rows (a date, whether a convention happens that
  day, and who is going that day).
- The API flattens this to one `CalendarEvent` **per day**, so most of the
  frontend works with day ids. `id` is the day's id. `multi_day_id` is the
  parent event's id, but only when the trip has more than one day; the frontend's
  `tripIdOf(day)` is `multi_day_id || id`.
- Rides, meals, cosplays, hotel rooms and expenses link to a **day** id
  (`linked_event_id`). Photos (stories) belong to a day. Hotel rooms belong to the
  parent event.
- `event_group_id` is only a **series label** ("HDCC"). Events in one group stay
  independent: separate RSVPs, participants and pages. Group by `multi_day_id`
  (the trip), never by `event_group_id`, for anything about a single trip.

People are stored **by name** in most arrays (`participants`, `passengers`, a
cosplay's `user_name`). A rename therefore leaves the old name behind, which is
why profiles keep an `aliases` list and why lookups everywhere resolve a stored
name through `name`, `discord_username` and `aliases`. Newer tables key on the
profile **id** instead (settlements) so a rename never splits a balance.

The full table list is in [database.md](database.md).

## How a request is authenticated

```
Browser ── Supabase Auth (Discord / Google) ──► access token (JWT)
Browser ── GET /api/…  Authorization: Bearer <token> ──► backend
                                                          │
   1. verify the token locally with the project's ES256 public key
      (falls back to asking Supabase if it can't be checked locally)
   2. sub = the profile id → load the profile
   3. not found → look at the verified Discord id / email, check the whitelist,
      create or claim the profile (first login sends a welcome DM)
   4. deactivated → 403.  Otherwise the request runs as that member
```

An admin "log in as" session uses a token minted by the backend itself
(HS256, 2 hours) and is verified the same way afterwards. The details, and what
is protected against, are in [security.md](security.md).

## Files and photos

Every uploaded image lives in one MinIO bucket, `story-photos`, one folder per
kind (story photos, `cosplay/`, `event-covers/`, `badges/`, `banners/<user>/`).
Files get a random name and are never overwritten, so each is stored with
`Cache-Control: public, max-age=31536000, immutable`. Files uploaded before MinIO
was added still live in Supabase Storage and keep working.

Uploads are compressed in the browser first, then validated and re-encoded by the
backend (`app/core/uploads.py`), then written to MinIO with short timeouts
(5 s connect, 15 s read). The blocking work runs in a thread pool so one slow
upload can never stall the API. See [minio-setup.md](minio-setup.md).

## Background jobs and notifications

`main.py` starts an APScheduler inside the API process (Europe/Amsterdam):

| Job | When | Does |
| --- | --- | --- |
| `check_and_send_reminders` | daily at 08:00 | event reminders 7 days, 1 day and on the day |
| `check_and_send_ticket_reminders` | every 15 minutes | "ticket sale opens in 24 hours" and "is open now" |

Notifications go two ways: a **shared webhook** post (an embed in the group's
Discord channel) and **personal DMs** through the bot. DMs are opt-in per
category (`event_created`, `ticket_sale`, `event_reminder_*`, `ride_created`,
`expense_created`, `meal_created`), and only active members with "DM's toestaan"
switched on receive them. Payment requests are personal DMs that only need the
master switch. All of it is fire-and-forget: a failed DM never fails the request.

Because the scheduler lives in the API process, **two backends on the same
database send every reminder twice**. Do not leave a local backend running
against the production database.

## Working on bad reception

The app is built for convention halls, so a slow or missing connection is a
normal case, not an error:

- **Service worker** (`frontend/sw/service-worker.js`): the app shell and every
  content-hashed asset are cached, so a cold start does not wait for the network.
  `index.html` is always fetched fresh (it names the current bundle), and `/api`
  is never cached by the worker. A new build installs in the background and the
  page offers "Nieuwe versie".
- **Persisted query cache**: server data is kept in `localStorage` for 24 hours
  (dropped when the app version changes, on logout and on impersonation), so the
  app opens on the last known data and refreshes behind it.
- **Cache headers** (`main.py`): hashed build files are `immutable` for a year;
  everything else is `no-cache`.
- **Timeouts**: requests give up after 30 s (uploads 60 s) instead of hanging.
- **Upload queue**: a story photo that cannot be sent is kept in IndexedDB and
  retried when the connection returns, even after the app is closed.
  Cosplay images are retried while their form stays open.
- **Weather** is cached and refreshed at 08, 12, 16 and 20 o'clock.
- **Errors**: a screen that cannot load points at `status.ankerd.org`. If Supabase
  is unreachable the backend answers `503`, never `401`, so the app does not log
  people out over a network blip.

## Design decisions worth knowing

- **The backend is the only authority.** See above.
- **Local token verification.** Real logins are verified against Supabase's
  published ES256 key, not by calling Supabase on every request. This removed a
  network round trip per request and the failures that came with it.
- **One image bucket, immutable names.** Makes caching trivial and deletes
  explicit.
- **No floating UI.** Sheets (`TripSheet`) for anything that opens over a page,
  no floating action buttons. See [design-system.md](design-system.md).
- **Admin tools live in the chrome.** The time-travel clock and "log in as"
  banner sit in the sidebar and top bars, never over content.
- **Time travel.** Anything that depends on "now" reads `getNow()`
  (`store/time.store.ts`), so an admin can set the clock to test trips that are
  live or over.
