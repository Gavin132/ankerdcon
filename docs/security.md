# Security

How access is controlled, what protects it, and what to watch. The model in one
sentence: **the backend is the only thing that touches data, and it decides
everything itself.** See [architecture.md](architecture.md) for why.

- [Authentication](#authentication)
- [The whitelist](#the-whitelist)
- [Authorization](#authorization)
- [Log in as](#log-in-as)
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

Failures that say nothing about the token (Supabase unreachable, a dropped
connection) are retried and end as **503**, not 401, so the app retries instead of
logging the member out.

## The whitelist

Access is **invite-only**. The `whitelist` table lists Discord ids and/or email
addresses that may log in; anyone else gets a 403 ("Geen toegang") even with a valid
Supabase account, because anyone can create one.

- Manage it in **Admin → Whitelist**, or in SQL:
  `INSERT INTO whitelist (discord_id) VALUES ('123456789012345678');` or
  `INSERT INTO whitelist (email) VALUES ('name@example.com');` (emails are lowercased).
- A whitelisted first login creates the profile (and sends a welcome DM). Profiles are
  **only ever created by the backend**, never by a database trigger, because a trigger
  would skip the whitelist (migrations v2.23 and `remove_trigger.sql`).
- An admin can create a **stub profile** ahead of time. It is only claimed by a Discord
  account that is on the whitelist with a matching id.
- Deactivating or deleting a member cuts off access at once and sends them a DM.

## Authorization

Everything that is not "any signed-in member may do this" is a line in a router.

| Rule | Where | Meaning |
| --- | --- | --- |
| member | `get_current_user` | any whitelisted, active member |
| admin | `get_admin_user` | additionally `profiles.is_admin`, read from the database (never from the token) |
| acting for someone | `act_as` / `act_for_anyone` | sign-ups (meals, seats, trip days, hotel rooms) may name anyone; `paid_by`, location pings and cosplays only yourself (admins anyone). See [acting-for-others.md](acting-for-others.md). |
| creator or admin | `require_owner_or_admin` | deleting things you made |
| involved party | in the router | a settlement can be confirmed by its receiver, withdrawn by either side |

The frontend mirrors these rules (`useActingPermissions`) so it does not offer what
would be refused. That is a convenience; the backend is what enforces them.

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
  never reaches other members (GIFs are only checked, since re-encoding would drop frames);
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
