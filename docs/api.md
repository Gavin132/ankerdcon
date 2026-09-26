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
  and cosplay images 15 MB, admin images 10 MB, banners 8 MB. Images are decoded,
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
| `PUT /users/preferences` | member | edit your profile (colour, bio, notifications, …) |
| `PATCH /users/name` | member | rename yourself (the old name becomes an alias) |
| `POST /users/me/onboarding` | member | finish onboarding |
| `POST /users/me/link-discord` | member | link a Discord account to a Google login |
| `PUT /users/{id}/location` | member | set a location ping (for yourself, via `act_as`) |
| `POST /users/banner`, `DELETE /users/banner` | member | upload or remove your banner |

### Calendar (trips) — `/calendar`

| Method and path | Who | What |
| --- | --- | --- |
| `GET /calendar/` | member | every event **day** with its trip's data |
| `POST /calendar/{day}/rsvp`, `…/leave` | member | sign a member up for a day, or off |
| `GET /calendar/feed-url` | member | your private `.ics` subscription link |
| `GET /calendar/feed.ics?token=` | *public, by token* | the `.ics` feed |
| `GET /calendar/{day}/hotel-rooms` | member | rooms of the trip |
| `POST /calendar/{day}/hotel-rooms`, `…/bulk` | member | create a room, or many |
| `POST /calendar/{day}/hotel-rooms/{room}/assign`, `…/leave` | member | take or leave a bed |

### Rides — `/rides`

| Method and path | Who | What |
| --- | --- | --- |
| `GET /rides/` (`?direction=`) | member | rides |
| `POST /rides/` | member | offer a ride |
| `DELETE /rides/{id}` | owner | remove a ride |
| `POST /rides/{id}/claim`, `…/leave` | member | take or leave a seat |
| `POST /rides/{id}/restaurant-driver`, `…/leave` | member | join or leave as a driver of a restaurant ride |
| `POST /rides/{id}/restaurant-driver/assign`, `…/unassign` | member | put a passenger in or out of a car |

### Meals — `/meals`

| Method and path | Who | What |
| --- | --- | --- |
| `GET /meals/` | member | meals |
| `POST /meals/` | member | plan a meal |
| `POST /meals/{id}/rsvp`, `…/cancel-rsvp` | member | join or leave |
| `DELETE /meals/{id}` | owner | remove |

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
| `GET /stories/summary?event_day_ids=a,b` | member | per day: photo count, newest photo, whether there is anything unseen |
| `GET /stories/user/{id or name}` | member | every photo one member uploaded, with its event |
| `GET /stories/{day}` | member | a day's photos in order |
| `POST /stories/{day}` | member | upload a photo (multipart, field `file`) |
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
| Overview | `GET /admin/stats`, `GET /admin/cdn` (`?limit=&offset=&kind=`: every file in the bucket, newest first) |
| Users | list, create (a stub for the whitelist), update, delete, bulk delete, bulk deactivate, `POST /admin/impersonate/{id}` ([security.md](security.md#log-in-as)), badges per user |
| Whitelist | list, add, remove |
| Rides, meals | list, create, update, delete, bulk delete, remove one passenger or participant |
| Events | list events and days, create, update, delete, add a day, update or delete a day, remove one participant, bulk RSVP, bulk delete, bulk set group |
| Hotel rooms | list, update, delete |
| Event groups | list, create, update, delete, bulk delete |
| Badges | list, create, update, delete, reorder |
| Expenses | update (its linked event), delete, `PUT /admin/expense-shares/{id}` to force a status. Refused with 409 while the expense or share is in an open settlement. |
| Announcements, changelog | list, create, update, delete |
| Images | `POST /admin/uploads/{kind}` for event covers and badge images |
| Delete a file | `DELETE /admin/cdn?key=<object key>` removes any file in the bucket and clears what pointed at it (story photo row, cosplay image, banner, event cover). Refuses a file a badge still uses (409). |
| Quick upload | `POST /admin/quick-upload` stores an image or video under `uploads/` and returns `{url, key, media, size}` |

## Interactive docs

Off by default. Set `API_DOCS_ENABLED=true` to get Swagger at `/api/docs`,
ReDoc at `/api/redoc` and the schema at `/api/openapi.json`. They map out every
endpoint for whoever finds them, so keep them off on anything reachable from the
internet.
