# Security

How access is controlled, what protects it, and what to watch. The model in one
sentence: **the backend is the only thing that touches data, and it decides
everything itself.** See [architecture.md](architecture.md) for why.

- [Authentication](#authentication)
- [The whitelist](#the-whitelist)
- [Authorization](#authorization)
- [Log in as](#log-in-as)
- [Placeholders and merging](#placeholders-and-merging)
- [Requests and responses](#requests-and-responses)
- [Uploads](#uploads)
- [Money and links](#money-and-links)
- [Secrets](#secrets)
- [Known limits](#known-limits)

---

## Authentication

Members log in with **Discord** or **Google** through Supabase Auth and receive an
access token. Every API request carries it; the backend (`app/dependencies.py`,
`get_current_user`) then:

1. **Verifies the token locally** against the project's published signing key
   (ES256; RS256 also accepted), checking signature, audience, issuer and expiry.
   A token can never choose how it is checked: the key decides the algorithm, so
   the classic "switch the algorithm" tricks do nothing. Anything that cannot be
   checked locally (an unknown key, the key set unreachable) is checked by asking
   Supabase.
2. **Finds the profile** by the token's `sub`, which is the Supabase auth user id
   and is stable across linked providers.
3. **Otherwise resolves who this is from what Supabase verified during the login**
   (the Discord id, or the email for Google), never from anything a member can edit
   on their own profile. That is what stops a login from being used to take over
   someone else's account. It then applies the [whitelist](#the-whitelist).
4. Refuses deactivated profiles (403).

Once found, `discord_id`, `discord_username`, `email` and `avatar_url` are backfilled
when empty, never overwritten — except the avatar, which is also re-checked once a
day (`avatar_synced_at`) and replaced when it differs, so a changed or since-broken
avatar image heals itself on a later login instead of staying wrong forever.

Failures that say nothing about the token (Supabase unreachable, a dropped
connection) are retried and end as **503**, not 401, so the app retries instead of
logging the member out.

## The whitelist

Access is **invite-only**. The `whitelist` table lists Discord ids and/or email
addresses that may log in; anyone else gets a 403 ("Geen toegang") even with a valid
Supabase account, because anyone can create one. Discord and Google are separate logins: a
member who signed up with one and then signs in with the other (with a different email) is not
linked to their profile and gets the "Geen toegang" screen, which for Google says to try Discord.
Only people who sign up with Google can link Discord (Instellingen), not the other way round.

- Manage it in **Admin → Whitelist**, or in SQL:
  `INSERT INTO whitelist (discord_id) VALUES ('123456789012345678');` or
  `INSERT INTO whitelist (email) VALUES ('name@example.com');` (emails are lowercased).
- A whitelisted first login creates the profile (and sends a welcome DM). Profiles are
  **only ever created by the backend**, never by a database trigger, because a trigger
  would skip the whitelist (migrations v2.23 and `remove_trigger.sql`).
- An admin can create a **stub profile** (a placeholder) ahead of time. It is only claimed by a Discord
  account that is on the whitelist with a matching id; otherwise the person gets a profile of their own and
  an admin merges the placeholder into it by hand ([below](#placeholders-and-merging)).
- Deactivating or deleting a member cuts off access at once, takes them (and their former names) off every ride, activity, trip day, hotel room and restaurant car, and sends them a DM. Deactivating in bulk does the same as the switch in the edit sheet.

## Authorization

A 403 that means **this account may not use the app** (not on the whitelist, deactivated) carries the
header `X-Access: denied`; the frontend shows its "Geen toegang" screen only for that. Every other 403
("admins only", "not yours") is an ordinary error, and a failed database lookup while checking admin
rights answers 503, never 403.

Everything that is not "any signed-in member may do this" is a line in a router.

| Rule | Where | Meaning |
| --- | --- | --- |
| member | `get_current_user` | any whitelisted, active member. A **read-only member ("kijker", `profiles.is_viewer`)** gets a 403 (without `X-Access`) on every request that changes something, except their own account (preferences, onboarding, test notification, avatar, banner, Discord link, push subscribe, feedback) and marking a story seen (`_VIEWER_WRITABLE`). Enforced here for every route at once, with the flag looked up only for writes and remembered 30 s. An admin is never read-only. A database without the column is treated as "nobody is read-only". |
| admin | `get_admin_user` | additionally `profiles.is_admin`, read from the database (never from the token) |
| hotel rooms | `routers/calendar.py` | any member (not a read-only one) creates, edits (number, floor, notes, capacity and who sleeps in it) and signs people up or off; only an admin deletes a room. Names put in a room must be members and the room may not exceed its capacity. |
| acting for someone | `act_as` / `act_for_anyone` | sign-ups (meals, seats, trip days, hotel rooms) may name anyone; `paid_by`, location pings and cosplays only yourself (admins anyone). See [acting-for-others.md](acting-for-others.md). |
| creator or admin | `require_owner_or_admin` | deleting things you made, claiming and confirming expense shares. "You" is the member's current name, Discord username and former names (aliases), minus any name another profile goes by (`_own_names`), because rows keep the name they were made under. Story photos use the same names but stay owner-only (`is_own_name`). |
| involved party | in the router | a settlement can be confirmed by its receiver, withdrawn by either side |

The frontend mirrors these rules (`useActingPermissions`, and `useMyNames().isMine` for ownership, built from `ownNames` in
`utils/people.ts`) so it does not offer what would be refused. That is a convenience; the backend is what enforces them.

## Log in as

**Admin → Inloggen als gebruiker** (`POST /api/admin/impersonate/{id}`) lets an admin
use the app as another member, mainly for guest profiles that have no login.

- Admin only. It refuses deactivated profiles and **other admins**.
- The backend mints a token for that profile (`sub` = the profile id), signed **HS256**
  with `SUPABASE_JWT_SECRET`, valid **2 hours**. The frontend shows a banner while
  it is active and clears its cached data on entering and leaving.
- Every use is written to the server log with the admin and the target.

What this is **not** protected against, and what is planned, is in
[TODO.md](../TODO.md#harden-inloggen-als-gebruiker-admin-impersonation):

- an impersonation session is **indistinguishable from the member**: whatever is done is
  recorded as them and nothing stops sensitive actions (a payment request pointing at the
  attacker's own bank link, renaming or unlinking an account);
- the tokens are signed with the same secret that verifies them, so **anyone who learns
  `SUPABASE_JWT_SECRET` can forge a login for any user**, admins included;
- a token cannot be revoked before it expires.

The risk is therefore a **hijacked admin account** or a **leaked secret**, not anything an
ordinary member can do. Protect the admins' Discord and Google accounts with two-factor
authentication and keep the secret out of screenshots and chat.

## Placeholders and merging

A **placeholder** is a profile nobody has ever logged in to: an admin made it (Admin > Gebruikers > Nieuwe gebruiker) so
the person can already be put on rides, meals and expenses. There is deliberately **no self-claim**: a member who logs in
for the first time gets a new profile (the one exception is the automatic claim of a stub whose name equals the Discord
username, see [The whitelist](#the-whitelist)), and an admin merges the placeholder into it by hand.

- **What counts as a placeholder** is one function, `is_placeholder` in `backend/app/services/profile_merge.py`: no `email`,
  no `discord_username` and no `avatar_url`, which is what every login fills in. `is_first_login` is not used because "log
  in as" clears it for a guest, and `discord_id` is not used because an admin may type one in ahead of time. The admin and
  member user lists carry it as `is_placeholder`.
- **`POST /admin/users/{id}/merge`** (`get_admin_user`, enforced in the router): the source must be a placeholder, the target a
  real, active member, and they must differ. `dry_run` (the default) only counts. The real merge is written to the server log
  as a `WARNING` (admin, both profiles, counts), like "log in as" and CDN deletes.
- **What it touches.** By id: `settlements` (`from_user_id`, `to_user_id`, `created_by`). By name (the placeholder's name and
  its aliases): `rides` (`driver`, `passengers`, the cars in `restaurant_drivers`), `meals` (`participants`, `created_by`),
  `event_days.participants`, `hotel_rooms.occupants`, `expenses.paid_by`, `expense_shares.participant`, `cosplays.user_name`,
  `story_photos.uploaded_by`, `story_seen.user_name`, `ride_costs.driver`, `parking_spots` (`driver`, `placed_by`),
  `feedback.user_name`, `push_subscriptions.user_name`. On the member's profile: `badge_ids` gain the placeholder's, and
  `aliases` gain its names. Tables from a later migration that has not been run are skipped.
- **Never twice.** In a name list the placeholder's name is replaced by the member's, or just removed when the member is on it
  already (under their name or an alias). Two restaurant cars of the same person become one. One row per (trip, driver) in
  `ride_costs` and `parking_spots` and per day in `story_seen` is kept for the member; the placeholder's duplicate is
  dropped (`story_seen` keeps the furthest). Two shares of the member in one expense are added up when they are in the same
  state, otherwise both stay.
- **Money.** A settlement between the two is dropped (it would be a payment to oneself) and the expense shares it held are
  freed. A share the member would now owe themselves is marked paid. Other settlements move to the member; if the
  placeholder and the member both have an *open* settlement with the same person in the same currency the merge is
  refused (409), because the database allows one open settlement per pair.
- **No transaction, so the order is the safety.** Supabase's REST client has none. Every step is a rename "placeholder name
  to member name" (idempotent), lists are changed with `update_list` (compare-and-swap, so a sign-up at the same moment is
  kept), the placeholder is deleted only after all of that (a profile delete cascades to its settlements), and its name
  becomes an alias only after it is deleted (an alias another profile still has is rejected elsewhere). A failure halfway
  answers 503 and the placeholder is still there: run the merge again and it carries on.
- **Not touched, on purpose:** `announcements.created_by` and `changelog_entries.created_by` (admin-written; a placeholder
  never logged in so it cannot have written them), the `whitelist`, and the placeholder's own fields (phone, bio, colour,
  a typed-in `discord_id`): the member keeps theirs. The placeholder's `discord_id`, if any, is dropped with the profile.

## Requests and responses

`app/core/security.py`, wired in `main.py`:

- **Security headers** on every response: `nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy` (camera, microphone and payment off,
  geolocation only for the app), HSTS. The app gets a tight
  **Content-Security-Policy** (scripts only from the app itself plus one hashed inline
  handler for the font loader; images over https; connections to the app, Supabase,
  Open-Meteo and Nominatim; frames only for Google Maps). The API's CSP forbids
  everything. **If you change the inline `onload` in `frontend/index.html`, the hash in
  `_app_csp` must change with it**, or the fonts stop loading.
- **CORS** only for `CORS_ORIGINS`.
- **Rate limiting** per client IP (600 a minute, writes a quarter of that). Behind
  Cloudflare and the proxy the real IP is taken from `cf-connecting-ip`, but only when
  the request really comes from the proxy's private address, otherwise anyone could send
  a made-up IP with each request.
- **Body size** at most 20 MB (90 MB for the admin quick upload only), and an upload
  must state its size up front.
- **Errors** are Dutch JSON; no traceback ever reaches a client.
- **API docs** are off unless `API_DOCS_ENABLED=true`.
- **Browsers cannot reach the database or storage directly** (v2.22): RLS on, no
  policies, no public write access to Supabase Storage.

## Uploads

Nothing is stored as it was sent. The browser compresses photos first, and the backend
(`app/core/uploads.py`) then:

- reads the body in chunks and aborts as soon as it is over the limit;
- decodes it to see what it really is (the `Content-Type` is only a claim) and rejects
  anything that is not JPG, PNG or WebP (banners also GIF), with a pixel cap against
  decompression bombs;
- re-encodes stills **without metadata**, so the EXIF GPS position a phone puts in a photo
  never reaches other members (GIFs are only checked, since re-encoding would drop frames;
  a JPEG that carries no metadata is kept as is, so the app's own already compressed photos
  do not go through a second lossy pass);
- writes it to MinIO under a random name with short timeouts, in a worker thread.

**Quick upload (admin only).** Admin → CDN has an "Uploaden" button for putting an image
or video in the bucket to embed somewhere, under `uploads/<random>.<ext>`. Only what the
bytes really are is accepted: images (JPG, PNG, WebP, GIF, 10 MB) are re-encoded like
every other image; videos (MP4, MOV, WebM, 80 MB) cannot be re-encoded, so their file
header is checked instead (an MP4/MOV `ftyp` box with a video brand, or a WebM header)
and they are stored as they are with the matching content type. HTML, SVG, PDF and
anything else is refused, so a link to an upload can never run a script in a browser.
Video metadata (such as a GPS position) is not stripped.

Uploaded files are public to anyone who has the URL (the bucket allows `GetObject` only,
and not listing). Admins can review everything in **Admin → CDN**, and delete any file there
whoever uploaded it: the references to it (story photo, cosplay image, banner, event cover) are
cleared first and the delete is logged as a `WARNING`. A badge's own image cannot be deleted while
the badge uses it.

## Money and links

- A settle-up **payment link** must be `https` and point at Tikkie, bunq, PayPal,
  Revolut, Klarna or one of the big Dutch banks, matched on the real host
  (`tikkie.me@evil.example` and `tikkie.me.evil.example` are refused). The list is
  `PAYMENT_LINK_DOMAINS` in `app/services/settle_up.py`. The payer sees the provider and
  domain before opening it, and it opens in a new tab with `noopener`.
- Bank details (link, IBAN, account name) are only returned to the two people in the
  settlement, are never stored on a profile, cannot be edited after creation, and are
  cleared on confirmation. Discord DMs about a payment never contain them: only a link to
  the app itself.
- IBANs are checksum-validated. Amounts are handled in whole cents.
- What is left is the trust in the group: a member could send a genuine Tikkie of their
  own. The amount is shown before paying.

## Secrets

| Secret | Lives in | Grants | If it leaks |
| --- | --- | --- | --- |
| `SUPABASE_SECRET_KEY` | backend env | full database access | rotate it in Supabase; whoever has it bypasses every rule |
| `SUPABASE_JWT_SECRET` | backend env | signs and accepts "log in as" tokens; seeds the calendar feed link | anyone can forge a login for any user. Rotate it and redeploy. |
| `DISCORD_BOT_TOKEN`, `DISCORD_WEBHOOK_URL` | backend env | send DMs and channel posts as the bot | reset in the Discord developer portal |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | backend env | read, write and list the bucket | recreate the key with `mc admin accesskey create` |
| MinIO root password | Portainer stack | administer MinIO itself | change it in the stack; then check that the app's key still works |
| `CALENDAR_FEED_TOKEN` | backend env | read access to the `.ics` feed | set a new value: every shared link stops working |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend (public) | nothing on its own | it is meant to be public |

Never put the secret key or any other backend secret in `frontend/.env`, in a commit, or in
chat. `backend/.env` is git-ignored and `.dockerignore` keeps it out of the image.

## Known limits

- Impersonation and the audit trail: see [Log in as](#log-in-as).
- Members cannot sign other members up for things, on purpose. The alternative, and
  its cost (signing someone up without their consent), is described in
  [acting-for-others.md](acting-for-others.md).
- Story photos can only be deleted by their uploader, not by an admin, through the app.
- The rate limiter and reminder scheduler live in memory in the API process: run **one**
  backend per database.
- Uploaded files are reachable by URL without logging in. Treat a photo URL like a shared
  link.
