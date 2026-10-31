# API reference

Every endpoint of the backend, grouped by area. The code for each area is the
router in `backend/app/routers/` with the same name; route paths are defined in
one place, `backend/app/routes.py`, and mirrored for the frontend in
`frontend/src/config/api-routes.ts`.

- [Conventions](#conventions)
- [Endpoints](#endpoints)
- [Interactive docs](#interactive-docs)

---

## Conventions

- **Base path:** everything is under `/api`. Paths below omit it.
- **Auth:** send `Authorization: Bearer <Supabase access token>`. Nearly every
  endpoint needs a signed-in member; **admin** endpoints also need `is_admin`.
  Exceptions are marked *public*. See [security.md](security.md#authentication).
- **Errors:** always JSON, `{"detail": "<Dutch message>"}`, never a traceback.

  | Status | Meaning |
  | --- | --- |
  | 400 | the request makes no sense in the current state ("Rit is vol.") |
  | 401 | missing, invalid or expired token |
  | 403 | logged in but not allowed (not your ride, not on the whitelist, not an admin) |
  | 404 | not found |
  | 409 | conflicts with the current state (a settlement is already open, an expense is in a settlement) |
  | 411, 413 | an upload without a size, or larger than allowed |
  | 415 | an upload that is not an allowed image type |
  | 422 | invalid input (a generic Dutch message; details are in the server log) |
  | 429 | rate limit |
  | 503 | the database or storage could not be reached. Retry; the app does. |

  Supabase being unreachable is a **503**, never a 401, so a network blip does not
  log anyone out.
- **Rate limit:** 600 requests per minute per client, a quarter of that for anything
  that is not a GET (`RATE_LIMIT_PER_MINUTE`). The client is identified from
  `cf-connecting-ip`, but only when the request comes from the reverse proxy.
- **Upload limits:** the whole request may be at most 20 MB. Per file: story photos
  and cosplay images 15 MB, admin images 10 MB, banners 8 MB, avatars 5 MB. Images are decoded,
  stripped of metadata (EXIF, including GPS) and re-encoded; only JPG, PNG and WebP are
  accepted (banners also GIF).
  The admin quick upload is the exception: it also takes videos (MP4, MOV, WebM) up to
  80 MB, in a request of up to 90 MB.
- **Who is "you":** the profile the token resolves to. Endpoints that take a name
  (RSVP, claim a seat, `paid_by`) pass it through `act_for_anyone` (members may sign anyone up) or, for
  things that belong to one person such as `paid_by`, `act_as` (only yourself, admins anyone). See [acting-for-others.md](acting-for-others.md).
- **Health:** `GET /health` (public) returns `{"status": "ok"}`. Use it for
  monitoring.

## Endpoints

"Owner" means the creator or an admin (`require_owner_or_admin`).

### Users — `/users`

| Method and path | Who | What |
| --- | --- | --- |
| `GET /users/` | member | all members |
| `GET /users/me` | member | your own profile |
| `GET /users/{id or name}` | member | one profile, by id or name |
| `PUT /users/preferences` | member | edit your profile (colour, bio, notifications, …). `notification_categories` containing an admin-only category (`feedback_submitted`, `new_user`) is a 403 for anyone who is not an admin; an unknown category is a 422. `quiet_hours_start` and `quiet_hours_end` (0-23, both or neither, not equal) set the quiet hours, `quiet_hours_off: true` clears them (422 on an incomplete window; 503 "Stille uren zijn nog niet beschikbaar" before migration v2.44) |
| `PATCH /users/name` | member | rename yourself (the old name becomes an alias) |
| `POST /users/me/onboarding` | member | finish onboarding (same rule for admin-only notification categories) |
| `POST /users/me/link-discord` | member | link a Discord account to a Google login |
| `DELETE /users/me/discord` | member (also read-only) | forget the linked Discord account on the profile, after the browser has unlinked it from the login (`supabase.auth.unlinkIdentity`); 409 while Discord is still on the login, 400 when none is linked |
| `POST /users/me/deletion-request` | member (also read-only) | ask for the account and data to be deleted: saved as a message under Admin → Feedback and sent to **every active admin** as a DM/push, whatever notifications they chose (`broadcast_category_dm(admins_always=True)`); at most 2 a day (429). The app does not delete anything itself |
| `GET /users/me/export` | member | everything stored about you as one JSON download: profile (never the login hash), the days you go, your rides, activities, expenses and shares, cosplays, photos, ticket votes and feedback, found by every name you go by |
| `POST /users/me/test-notification` | member | send yourself one message through your saved channel(s); 5 an hour |
| `PUT /users/{id}/location` | member | set a location ping (for yourself, via `act_as`) |
| `POST /users/banner`, `DELETE /users/banner` | member | upload or remove your banner |
| `POST /users/avatar`, `DELETE /users/avatar` | member | upload or remove a custom profile picture — JPG/PNG/WebP (5 MB) or a small GIF (2 MB, kept as is, not re-encoded) — replacing/restoring the Discord or Google one |

### Calendar (trips) — `/calendar`

| Method and path | Who | What |
| --- | --- | --- |
| `GET /calendar/` | member | every event **day** with its trip's data |
| `POST /calendar/{day}/rsvp`, `…/leave` | member | sign a member up for a day, or off |
| `GET /calendar/feed-url` | member | your private `.ics` subscription link |
| `GET /calendar/feed.ics?token=` | *public, by token* | the `.ics` feed |
| `GET /calendar/{day}/hotel-rooms` | member | rooms of the trip |
| `POST /calendar/{day}/hotel-rooms`, `…/bulk` | member | create a room, or many. A new room with `occupants` moves those people out of their other rooms and answers with the room plus `moved` |
| `PUT /calendar/{day}/hotel-rooms/{room}` | member | edit a room: number, floor, notes, capacity and `occupants` (the whole list; new names must be members; at most `capacity` people). `null` clears a field, leaving it out keeps it. Answers `{moved: [{name, room_id, room_number}]}`: the people who were taken out of another room because they are in this one now |
| `POST /calendar/{day}/hotel-rooms/{room}/assign` | member | take a bed (`user_names`). A person sleeps in one room: anyone in another room of the hotel is moved here, under all their names, and a full room (400) refuses before anybody leaves their old room. Answers `{moved: [...]}` like the PUT |
| `POST /calendar/{day}/hotel-rooms/{room}/leave` | member | give up a bed |

### Rides — `/rides`

| Method and path | Who | What |
| --- | --- | --- |
| `GET /rides/` (`?direction=`) | member | rides |
| `POST /rides/` | member | offer a ride |
| `DELETE /rides/{id}` | owner | remove a ride |
| `POST /rides/{id}/claim`, `…/leave` | member | take or leave a seat |
| `POST /rides/{id}/restaurant-driver`, `…/leave` | member | join or leave as a driver of a restaurant ride |
| `POST /rides/{id}/restaurant-driver/assign`, `…/unassign` | member | put a passenger in or out of a car (400 "Deze auto is vol." when no seat is left) |

Creating a ride broadcasts `ride_created` (`app/routers/rides.py`'s `_notify_ride_created`, also used by
`admin_create_ride`), narrowed by `_day_ride_eligible_names` beyond the usual category opt-in: only a
member signed up for that ride's day (`event_days.participants`) who doesn't already have a ride for the
same need — the same `direction` that day, or for a `Restaurant` ride, a ride to that same
`linked_meal_id` specifically. A ride with no `linked_event_id` (there is nothing to check "signed up"
against) falls back to notifying every opted-in member, as before.

### Activities — `/meals`, `/meal-categories`

| Method and path | Who | What |
| --- | --- | --- |
| `GET /meals/` | member | activities, each with its `category` |
| `POST /meals/` | member | plan an activity (`category_id` optional: defaults to the first category) |
| `GET /meal-categories` | member | the kinds of activity, in order |
| `POST /meals/{id}/rsvp`, `…/cancel-rsvp` | member | join or leave |
| `PUT /meals/{id}` | owner | edit |
| `DELETE /meals/{id}` | owner | remove |

`location_lat`/`location_lng` are resolved server-side on save (`app/services/geocoding_service.py`'s
`resolve_location()`) to place this meal's pin on the crew map — from `maps_url` when given (its own
embedded coordinates, extracted from the resolved link), otherwise by geocoding `location`.
Best-effort throughout; neither resolving means no pin.

### Cosplays — `/cosplays`

| Method and path | Who | What |
| --- | --- | --- |
| `GET /cosplays/` | member | all cosplays |
| `POST /cosplays/` | member | add one (max 3 images) |
| `POST /cosplays/images` | member | upload one image, returns its URL |
| `DELETE /cosplays/{id}` | owner | remove |

### Stories (photos) — `/stories`

| Method and path | Who | What |
| --- | --- | --- |
| `GET /stories/summary?event_day_ids=a,b` | member | per day: photo count, newest photo, whether there is anything unseen. `photo_count` is the event day itself; photos of the day just before or after the event are in `extra_days` (`date`, `photo_count`, `preview_url`) |
| `GET /stories/user/{id or name}` | member | every photo one member uploaded, with its event |
| `GET /stories/{day}[?taken_on=YYYY-MM-DD]` | member | a day's photos in order (with `taken_on`: those of that day beside the event instead), each with `media_type` and, where they exist, `thumb_url` (grids), `preview_url` (the viewer, only for a big photo) and `poster_url` (a video's still frame); `image_url` is always the full original |
| `GET /stories/{day}/download-all[?taken_on=]` | member | the day's photos (or those of one day beside the event) as one zip, streamed while it is built (413 above 300 photos; a file MinIO can't read is skipped) |
| `POST /stories/{day}[?taken_on=YYYY-MM-DD]` | member | upload (`taken_on`: the day it was taken when that is exactly one day before or after this day, else 422) a photo (multipart, field `file`, max 15 MB), or a video (`file` as MP4/MOV/WebM, max 80 MB, plus the still frame as field `poster`). Photos and videos come back with `media_type` (`image`/`video`, from the file name) and `poster_url` |
| `GET /stories/{day}/seen`, `PUT /stories/{day}/seen` | member | your watch progress |
| `GET /stories/photos/{id}/download` | member | the original, as a download |
| `DELETE /stories/photos/{id}` | uploader | remove |

### Expenses — `/expenses`

| Method and path | Who | What |
| --- | --- | --- |
| `GET /expenses/` | member | all expenses with their shares |
| `POST /expenses/` | member | add one. The shares must be positive, unique per person and add up to the bill exactly. |
| `DELETE /expenses/{id}` | owner | remove (refused with 409 while a share is in an open settlement) |
| `POST /expenses/shares/{id}/claim` | the one who owes | "I paid" |
| `POST /expenses/shares/{id}/confirm` | the payer (or admin) | "I received it" |

### Settlements — `/settlements`

| Method and path | Who | What |
| --- | --- | --- |
| `GET /settlements/` | member | what is open between you and each other member, plus your settlements |
| `POST /settlements/` | member | start one: `action` is `paid`, `request` or `received`, with an optional `request_url` (an allowed payment provider) and `iban` |
| `POST /settlements/{id}/paid` | the payer | "I paid" a request |
| `POST /settlements/{id}/confirm` | the receiver | "I received it": settles every covered share |
| `DELETE /settlements/{id}` | either party | withdraw, or say it never arrived. Not once confirmed. |

### Content — `/badges`, `/announcements`, `/changelog`

| Method and path | Who | What |
| --- | --- | --- |
| `GET /badges/` | member | badge definitions |
| `GET /announcements/active` | member | the banner messages to show |
| `GET /changelog/` | member | release notes |
| `POST /feedback/` | member | send a bug, idea or remark (`kind`, `message` 5–2000 characters, `anonymous`, `app_version`). Anonymous rows carry no name. At most 5 per member per hour (429), counted in memory per process. |

### Push — `/push`

| Method and path | Who | What |
| --- | --- | --- |
| `POST /push/subscribe` | member | save (or refresh) this device's push subscription — the exact `PushSubscription.toJSON()` shape. Upserted on `endpoint`, so resubscribing the same device never duplicates. |
| `DELETE /push/subscribe` | member | remove a subscription by `endpoint` — turns push off for that one device |

Sending goes through `app/services/push_service.py`, called from `notification_service.py`
alongside every Discord DM: `notification_categories` governs both channels (a member who wants
"Nieuwe rit" gets it as a DM and/or a push, whichever they've set up); `allow_dm` only ever
gated the DM half. The backend keeps the two channels fully independent on purpose — the
frontend's `NotificationChannelPicker` is what makes a member pick just one, by flipping
`allow_dm` and the device's push subscription together; nothing stops both being on at once if
called directly. The push notification's title is a short, category-specific label (e.g.
"Nieuwe maaltijd"), not the app name — a phone's own notification chrome already shows that;
see `notification_service._PUSH_TITLES` for the mapping, and pass `title=` to `send_personal_dm`
for a one-off notice (settlements.py) that isn't tied to a category. Needs
`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` — see
[deployment.md#web-push](deployment.md#web-push); without them, sending silently does nothing.

### Weather — `/weather`

| Method and path | Who | What |
| --- | --- | --- |
| `GET /weather/geocode` (`?name=`) | member | Open-Meteo's geocoding search, passthrough |
| `GET /weather/forecast` (`?latitude=&longitude=&date=`) | member | Open-Meteo's daily + hourly forecast for one date, passthrough |
| `GET /weather/archive` (`?latitude=&longitude=&start_date=&end_date=`) | member | Open-Meteo's historical daily data, passthrough |

A caching proxy (`app/routers/weather.py`) in front of Open-Meteo for the member-facing weather
card (`hooks/useEventWeather.ts`) — every browser used to call Open-Meteo directly, which meant a
burst of members opening the app around the same time could hit it with the same request many
times over. Response shapes are untouched, so the frontend's own parsing/WMO-code mapping is
unchanged; only the URL moved. Cached in-process, keyed by the request's own params — a day for a
geocode, 2 hours for a forecast, a week for archive data. This is separate from each device's own
`staleTime` throttle (`msUntilNextWeatherSlot()`), which is not a real cache, just "don't ask
again too soon" — see [architecture.md](architecture.md#working-on-bad-reception).

### Parking — `/parking`

| Method and path | Who | What |
| --- | --- | --- |
| `GET /parking/{trip_id}` | member | every parking spot set for that trip |
| `POST /parking/{trip_id}` | member\* | set (or correct) a driver's spot — `{driver, lat, lng}` |
| `DELETE /parking/{trip_id}/{driver}` | member\* | clear a spot |

\* The driver themselves, anyone who shares one of that driver's rides for this trip (either
direction), or an admin — checked server-side (`app/routers/parking.py`'s `_can_manage`), not
just hidden client-side. `trip_id` is whatever the frontend's own `tripIdOf()` resolves to for
the trip (an `events.id` for a multi-day trip, an `event_days.id` for a single-day one — see
`_day_ids_for_trip` for how the backend resolves either shape back to day ids). One row per
`(trip_id, driver)` — a second person correcting the spot upserts the same row. Which of that
driver's rides is "current" (for display and for the pin's own 2-hour-after-departure expiry) is
resolved client-side in `CrewMap.tsx`, not stored here.

### Ticket vote — `/ticket-polls`

| Method and path | Who | What |
| --- | --- | --- |
| `GET /ticket-polls/{trip_id}` | member | the trip's ticket vote with its options and votes, or `null` when there is none |
| `PUT /ticket-polls/{trip_id}` | admin | opens the vote — `{options: [{label, price}]}` (1 to 8; the server gives them ids); 409 when the trip has one already (delete it first) |
| `PUT /ticket-polls/{trip_id}/vote` | member | `{choice, user_name?}`: a ticket's id or `unsure`; replaces the earlier vote. Members vote for themselves (`act_as`), an admin may vote for someone. 409 once the tickets are bought |
| `POST /ticket-polls/{trip_id}/bought` | admin | `{buyer, option_id}`: the vote ends, the buyer and ticket are kept; the buyer has to be a member |
| `DELETE /ticket-polls/{trip_id}` | admin | removes the vote and its votes, so a new one can be opened |

`trip_id` is the frontend's `tripIdOf()` (an `events.id` for a multi-day trip, an `event_days.id` for a single-day
one); the vote belongs to the event either way. Opening and buying send the `ticket_vote` notification.

### Ride costs — `/ride-costs`

| Method and path | Who | What |
| --- | --- | --- |
| `GET /ride-costs` | member | the member's ride costs: per trip as a driver (the sheet: the amount, who shares it, what each owes) and as a passenger (what they owe which driver) |
| `PUT /ride-costs/{trip_id}` | driver | the driver's amount for the trip, all in one — `{amount}`; empty or 0 removes it; 404 without rides as driver there |

Amounts are worked out on the server (`app/services/ride_costs.py`): everyone pays the driver of the first
ride they took to the trip, the amount shared equally. A driver sees their passengers' amounts, a passenger
only their own line. `trip_id` is the frontend's `tripIdOf()` (an `events.id` for a multi-day trip, an
`event_days.id` for a single-day one).

### Link previews — *public*, not under `/api`

`GET /trips/{id}` and `GET /events/{id}` (the older link shape) are for link-unfurling
crawlers such as Discord and Slack, recognised by their User-Agent. They get a tiny HTML
page with Open Graph tags (name, cover and date only) so a shared link shows a real
preview; everyone else gets the normal app. Anyone can fake a crawler User-Agent, so
these pages are effectively public to whoever has the link, which is why the location
and description are left out. Only registered when the built frontend exists.

### Admin — `/admin` (admin only)

| Area | Endpoints |
| --- | --- |
| Overview | `GET /admin/stats`, `GET /admin/cdn` (`?limit=&offset=&kind=&event=`: every file in the bucket, newest first; `event` narrows story photos to one event) |
| Users | list (with `is_placeholder`), create (a stub for the whitelist), update, delete, bulk delete, bulk deactivate, `POST /admin/impersonate/{id}` ([security.md](security.md#log-in-as)), badges per user, `POST /admin/users/{id}/merge` (below) |
| Whitelist | list, add, remove |
| Feedback | `GET /admin/feedback` (newest first), `PUT /admin/feedback/{id}` (status `new`, `seen` or `done`), `DELETE /admin/feedback/{id}` |
| Meal categories (`/admin/meal-categories`) | list, create, update (name, order, switches), delete (409 while in use) |
| Rides, meals | list, create, update, delete, bulk delete, remove one passenger or participant |
| Events | list events and days, create, update, delete, add a day, update or delete a day, remove one participant, bulk RSVP, bulk delete, bulk set group |
| Hotel rooms | list, delete (editing is for every member, see Calendar) |
| Event groups | list, create, update, delete, bulk delete |
| Badges | list, create, update, delete, reorder |
| Expenses | update (its linked event), delete, `PUT /admin/expense-shares/{id}` to force a status. Refused with 409 while the expense or share is in an open settlement. |
| Announcements, changelog | list, create, update, delete |
| Images | `POST /admin/uploads/{kind}` for event covers and badge images |
| Download as zip | `GET /admin/cdn/download?kind=&event=` streams one zip of the same selection, keeping the bucket's folders. Built while it is sent (stored, not recompressed), so a big one starts at once. Refused with 413 above 1.5 GB or 3000 files; 404 when nothing matches. A file MinIO cannot read is skipped and logged. |
| Delete a file | `DELETE /admin/cdn?key=<object key>` removes any file in the bucket and clears what pointed at it (story photo row, cosplay image, banner, event cover). Refuses a file a badge still uses (409). |
| Quick upload | `POST /admin/quick-upload` stores an image or video under `uploads/` and returns `{url, key, media, size}` |

**Merging a placeholder** (`POST /admin/users/{source_id}/merge`, body `{"target_id": "…", "dry_run": true}`): folds a
placeholder profile (the one in the URL) into a real member. `dry_run` is `true` unless the request says `false`, and a dry run
changes nothing; both return `{dry_run, source_name, target_name, counts, dropped, alias_names}` (`counts` per kind of what moves,
`dropped` what is left out as a duplicate or a payment to oneself). 400 when the source is not a placeholder, the target is
one or is deactivated, or both are the same profile (each with a Dutch message that says what to do); 404 for an unknown
profile; 409 when the placeholder and the member both have an open settlement with the same person (finish one first).
What it touches, and in which order, is in [security.md](security.md#placeholders-and-merging).

## Interactive docs

Off by default. Set `API_DOCS_ENABLED=true` to get Swagger at `/api/docs`,
ReDoc at `/api/redoc` and the schema at `/api/openapi.json`. They map out every
endpoint for whoever finds them, so keep them off on anything reachable from the
internet.
