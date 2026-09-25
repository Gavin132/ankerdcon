# Installation guide

Everything needed to stand up your own copy of Ankerd Con from nothing: which accounts to
create, where every value of the `.env` file comes from, and how to run it in Docker (with
Portainer, or plain `docker compose`).

For running it on your own computer to develop, use [local-development.md](local-development.md).
For shipping changes to an install that already runs, use [deployment.md](deployment.md).

- [What you need](#what-you-need)
- [1. Supabase (database and login)](#1-supabase-database-and-login)
- [2. Discord (login, notifications)](#2-discord-login-notifications)
- [3. Google login (optional)](#3-google-login-optional)
- [4. MinIO (photos, optional)](#4-minio-photos-optional)
- [5. The values that are yours to choose](#5-the-values-that-are-yours-to-choose)
- [Every variable in one table](#every-variable-in-one-table)
- [6. Build and run in Docker](#6-build-and-run-in-docker)
- [7. Put it on the internet](#7-put-it-on-the-internet)
- [8. First start](#8-first-start)
- [Updating](#updating)
- [When it does not work](#when-it-does-not-work)

---

## What you need

| Piece | Needed for | Cost |
| --- | --- | --- |
| A **Supabase** project | the database and the login | free tier is enough |
| A **Discord** application | logging in with Discord, and the bot that sends notifications | free |
| A **Google Cloud** OAuth client | logging in with Google. Skip it if everyone has Discord. | free |
| **MinIO** (or any S3-compatible store) | photos: stories, banners, cosplay images, event covers | your own server |
| A **server with Docker** | running the app: one container | any machine that stays on |
| A **domain** and something that gives it HTTPS | members reach the app at `https://…` | a domain name |

Discord and MinIO are optional: without the bot token nobody gets DMs, without MinIO there
are no photo uploads, and everything else works. Supabase and a domain with HTTPS are not
optional, because login needs both.

Keep a scratch file open while you go through this. Every step ends with a value to write
down, and the [table at the end](#every-variable-in-one-table) says where each one goes.

---

## 1. Supabase (database and login)

Create a project at [supabase.com](https://supabase.com) → **New project**. Choose a region
close to your members and save the database password somewhere safe (the app does not use it,
but you need it for `pg_dump` later).

### 1a. The keys

Open **Project Settings → API Keys** (older projects: **Settings → API**).

| You need | Env variable | Notes |
| --- | --- | --- |
| **Project URL**, `https://<ref>.supabase.co` | `SUPABASE_URL` | The same value is used by the backend and, at build time, by the frontend. |
| **Publishable key**, starts with `sb_publishable_…` (older projects: the `anon` key) | `SUPABASE_PUBLISHABLE_KEY` | Public by design, baked into the frontend. Never put the secret key here. |
| **Secret key**, starts with `sb_secret_…` (older projects: the `service_role` key) | `SUPABASE_SECRET_KEY` | Full access to the database. Only ever in the backend's environment. |
| **JWT secret** | `SUPABASE_JWT_SECRET` | **Project Settings → JWT Keys → Legacy JWT Secret** (older: Settings → API → JWT Settings). Needed for the admin "log in as" feature and to seed the calendar link. Normal logins do not use it. |

`SUPABASE_PUBLISHABLE_KEY` is called `VITE_SUPABASE_PUBLISHABLE_KEY` in `frontend/.env`. The
Docker files in this repository take it under the shorter name and pass it on.

### 1b. The database

Open **SQL Editor**. The schema is **not** one file yet: `db/schema.sql` only holds the early
tables and the migrations assume an older shape, so a fresh project cannot be built from the
repository alone (see [database.md](database.md#a-fresh-database)). The reliable way is to copy
the schema from a database that already works (the live app or a friend's copy):

```bash
# Connection string of the WORKING project: Supabase → Connect → "Direct connection" or the
# session pooler. Put the password in.
pg_dump "postgresql://postgres:<password>@<host>:5432/postgres" \
  --schema-only --no-owner --no-privileges --schema=public > schema-dump.sql
```

Then paste `schema-dump.sql` into the SQL Editor of the **new** project and run it. Afterwards
run this once, because a `--no-privileges` dump leaves out the grants the backend needs:

```sql
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
```

Every table also needs row-level security **on** with **no policies** (the backend is the only
thing that touches the database). The migration `db/migrations/migration_v2.22_lock_down_direct_access.sql`
does that; run it last on a new project. If you dumped from an already locked-down project it is
part of the dump and running it again is harmless.

> Worth doing once: commit the dump as the new `db/schema.sql`, so the next install is a single
> file. That is the open item in [TODO.md](../TODO.md).

### 1c. Login: redirect URLs

**Authentication → URL Configuration:**

- **Site URL:** the public address of the app, e.g. `https://con.example.org`.
- **Redirect URLs:** add `https://con.example.org/**`. For local development also add
  `http://localhost:5173/**`.

### 1d. Login: providers

**Authentication → Sign In / Providers.** Enable **Discord** (step 2) and, if you want it,
**Google** (step 3). Each provider page shows a **Callback URL**, `https://<ref>.supabase.co/auth/v1/callback`.
That URL goes into the Discord and Google consoles below.

Leave "Allow new users to sign up" on: access is controlled by the app's own whitelist, not by
Supabase.

---

## 2. Discord (login, notifications)

Go to the [Discord Developer Portal](https://discord.com/developers/applications) →
**New Application**.

### 2a. Login with Discord

1. **OAuth2** page. Copy the **Client ID** and **Client Secret** (Reset Secret to see it).
2. Under **Redirects** add the Supabase **Callback URL** from step 1d and save.
3. In Supabase → Authentication → Providers → **Discord**: switch it on and paste the Client ID
   and Client Secret.

Nothing else in the app needs these two values.

### 2b. The bot (personal DMs) → `DISCORD_BOT_TOKEN`

1. **Bot** page → **Reset Token** → copy it. That is `DISCORD_BOT_TOKEN`. It is shown once.
2. No privileged intents are needed; leave them off.
3. **Invite the bot to the group's Discord server.** A bot can only message people it shares a
   server with. **OAuth2 → URL Generator**: tick the scope `bot`, no permissions, open the
   generated URL and pick the server.

Members can switch DMs off in their own settings.

### 2c. The channel webhook → `DISCORD_WEBHOOK_URL`

In Discord: the channel for group posts → **Edit Channel → Integrations → Webhooks → New
Webhook** → **Copy Webhook URL**. That is `DISCORD_WEBHOOK_URL` (announcements and shared
posts go there).

### 2d. Your Discord id (for the whitelist)

Discord → **User Settings → Advanced → Developer Mode** on. Then right-click your name →
**Copy User ID**. You need it in [step 8](#8-first-start).

---

## 3. Google login (optional)

1. [Google Cloud Console](https://console.cloud.google.com) → create or pick a project →
   **APIs & Services → OAuth consent screen** → external, fill in the app name and your email.
2. **Credentials → Create credentials → OAuth client ID** → type **Web application**.
3. **Authorized redirect URIs:** the Supabase **Callback URL** from step 1d.
4. Copy the **Client ID** and **Client secret** into Supabase → Authentication → Providers →
   **Google**.

Google members are matched on the whitelist by **email address**.

---

## 4. MinIO (photos, optional)

Follow [minio-setup.md](minio-setup.md): it covers the MinIO container, the read-only bucket
policy, the app's access key, and the reverse proxy for `cdn.<your domain>`. You come out with:

| Env variable | Value |
| --- | --- |
| `MINIO_ENDPOINT` | the public host only, no `https://`, e.g. `cdn.example.org` |
| `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | the app's own key pair (not the root user) |
| `MINIO_BUCKET` | `story-photos` |
| `MINIO_SECURE` | `true` when the endpoint is served over HTTPS |

The backend uploads through the same public address it later hands to browsers, so the host has
to be reachable from the app's container as well as from members.

---

## 5. The values that are yours to choose

| Env variable | What to put |
| --- | --- |
| `APP_URL` | the public address, no trailing slash: `https://con.example.org`. Used in links inside Discord messages, payment requests and link previews. |
| `CORS_ORIGINS` | the same address (comma-separated if there are several). Since the frontend is served by the backend itself this only matters if you open the API from another origin; the compose file defaults it to `APP_URL`. |
| `CALENDAR_FEED_TOKEN` | a random secret for the calendar subscription link. Generate one: `openssl rand -base64 32`, or `python -c "import secrets; print(secrets.token_urlsafe(32))"`. Leave empty to derive it from the JWT secret; set a new value to invalidate every shared link. |
| `RATE_LIMIT_PER_MINUTE` | requests per client per minute before HTTP 429. Default 600, and writes get a quarter of it. |
| `APP_ENV` | build-time only. `dev` builds the orange "beta" icon and title, empty (the default) is the live app. |
| `API_DOCS_ENABLED` | keep `false` (the compose file forces it). |

---

## Every variable in one table

`R` = required, `O` = optional. "Runtime" values are read by the container each time it starts;
"build" values are baked into the frontend when the image is built (changing them means
rebuilding, not just restarting).

| Variable | | When | Where it comes from |
| --- | --- | --- | --- |
| `SUPABASE_URL` | R | both | [1a](#1a-the-keys) |
| `SUPABASE_PUBLISHABLE_KEY` | R | build | [1a](#1a-the-keys) |
| `SUPABASE_SECRET_KEY` | R | runtime | [1a](#1a-the-keys) |
| `SUPABASE_JWT_SECRET` | O, recommended | runtime | [1a](#1a-the-keys) |
| `APP_URL` | R | runtime | [5](#5-the-values-that-are-yours-to-choose) |
| `CORS_ORIGINS` | O | runtime | [5](#5-the-values-that-are-yours-to-choose) |
| `CALENDAR_FEED_TOKEN` | O | runtime | [5](#5-the-values-that-are-yours-to-choose) |
| `DISCORD_BOT_TOKEN` | O | runtime | [2b](#2b-the-bot-personal-dms--discord_bot_token) |
| `DISCORD_WEBHOOK_URL` | O | runtime | [2c](#2c-the-channel-webhook--discord_webhook_url) |
| `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_SECURE` | O | runtime | [4](#4-minio-photos-optional) |
| `RATE_LIMIT_PER_MINUTE` | O | runtime | [5](#5-the-values-that-are-yours-to-choose) |
| `APP_ENV` | O | build | [5](#5-the-values-that-are-yours-to-choose) |
| `HOST_PORT`, `CONTAINER_NAME`, `IMAGE_TAG` | O | compose | port on the host (default 8000), container name, image tag |

Names differ in the two `.env` files used for local development: there the frontend's values are
called `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
([local-development.md](local-development.md#environment-variables)). In Docker you set each
value once and the compose file passes it on.

---

## 6. Build and run in Docker

The repository has one **`Dockerfile`** in its root. It builds the frontend in a first stage,
copies the result into the FastAPI image, and starts `uvicorn` on port 8000. One container serves
both the API (`/api/…`) and the app. It runs as an unprivileged user and has a health check on
`/api/health`. `docker-compose.yml` next to it wraps that in one service.

> The Dockerfile and compose file were written from the project's build steps and have **not**
> been run against a Docker daemon yet. Do a first build somewhere you can throw away and watch
> the output. If your existing Portainer stack builds differently, keep it; see
> [Your current stack](#your-current-stack) below.

### 6a. Plain `docker compose`

On any machine with Docker:

```bash
git clone https://github.com/Gavin132/ankerdcon.git
cd ankerdcon
git checkout main              # or development

# One file with all the values, next to docker-compose.yml. Never commit it.
cat > .env <<'EOF'
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_JWT_SECRET=...
APP_URL=https://con.example.org
DISCORD_BOT_TOKEN=...
DISCORD_WEBHOOK_URL=...
MINIO_ENDPOINT=cdn.example.org
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
EOF

docker compose up -d --build
docker compose logs -f
curl http://localhost:8000/api/health     # {"status":"ok","service":"ankerd-con-api"}
```

The first build downloads Node and Python images and installs the packages, which takes a few
minutes.

### 6b. Portainer

Portainer can build straight from the repository, so nothing has to be cloned by hand.

1. **Stacks → Add stack.** Name it (`ankerdcon`, or `ankerdcon-dev` for a beta copy).
2. **Build method: Repository.**
   - **Repository URL:** `https://github.com/Gavin132/ankerdcon` (private fork? turn on
     *Authentication* and give it a token with read access).
   - **Repository reference:** `refs/heads/main` for live, `refs/heads/development` for beta.
   - **Compose path:** `docker-compose.yml`.
3. **Environment variables → Advanced mode**, and paste the block below with your values. These
   are what fills the `${…}` placeholders in the compose file.
4. Under **GitOps updates** you can switch on periodic re-pulls, but a code change only goes live
   after the **image is rebuilt**, so use the *Re-pull image and redeploy* toggle; a plain restart
   starts the old image again.
5. **Deploy the stack.** The first deploy builds the image, which takes a few minutes; watch
   **Stacks → ankerdcon → Logs** on the container.

```dotenv
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_JWT_SECRET=...
APP_URL=https://con.example.org
CALENDAR_FEED_TOKEN=...
DISCORD_BOT_TOKEN=...
DISCORD_WEBHOOK_URL=...
MINIO_ENDPOINT=cdn.example.org
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_BUCKET=story-photos
MINIO_SECURE=true
# Beta copy only:
# APP_ENV=dev
# HOST_PORT=8001
# CONTAINER_NAME=ankerdcon-dev
```

Live and beta are two stacks of the same repository with different references, ports and container
names. Give them separate Supabase projects if you want them apart (see
[deployment.md](deployment.md#environments)).

### Your current stack

The live installation runs on a home server from a Portainer stack that clones the branch into a
volume before building; that stack is not in the repository yet. Its clone step is documented in
[deployment.md](deployment.md#deploying). To put the full stack here, paste it into this section
**with every secret replaced by a placeholder** (or a `${VARIABLE}`), and mention which ports and
networks it uses.

---

## 7. Put it on the internet

The container listens on port 8000 over plain HTTP. Put a reverse proxy in front that terminates
HTTPS. The live setup uses **SWAG** (nginx with Let's Encrypt) behind **Cloudflare**, but any
proxy works as long as it keeps three things:

- HTTPS on the public address, matching `APP_URL`.
- The client's address forwarded, so rate limiting sees members and not the proxy. The backend
  trusts `cf-connecting-ip`, `x-real-ip` and `x-forwarded-for` **only** when the request comes
  from a private address, so the proxy must reach the container over the LAN or a Docker network.
- Request bodies of at least **100 MB** allowed for the app (the admin quick upload takes videos
  up to 80 MB; ordinary photos are under 20 MB).

### SWAG example

`/config/nginx/proxy-confs/con.subdomain.conf`:

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name con.*;

    include /config/nginx/ssl.conf;

    client_max_body_size 100M;

    location / {
        include /config/nginx/proxy.conf;
        # Same pattern as the cdn conf in minio-setup.md: route by LAN address.
        set $upstream_app <lan-ip-of-the-docker-host>;
        set $upstream_port 8000;
        set $upstream_proto http;
        proxy_pass $upstream_proto://$upstream_app:$upstream_port;
    }
}
```

Restart SWAG after saving it. For a beta copy make a second conf with `server_name dev.*` and
the beta's `HOST_PORT`.

### DNS and Cloudflare

- Add an `A` record (or a CNAME to your DDNS name) for the app's host, and for `cdn.` if you use
  MinIO. With Cloudflare, switch the orange cloud on.
- SSL/TLS mode **Full (strict)** when SWAG holds a real certificate.
- Cloudflare gives a request roughly 100 seconds. The backend fails uploads faster than that on
  purpose, so a wedged MinIO shows an error instead of a hung button.
- Forward port 443 on your router to the SWAG host.

---

## 8. First start

1. Open `https://<APP_URL>/api/health`. It should answer `{"status":"ok",…}`.
2. **Whitelist yourself.** Access is invite-only, and a valid login that is not on the list gets
   "Geen toegang". In the Supabase SQL Editor:

   ```sql
   INSERT INTO whitelist (discord_id) VALUES ('<your Discord user id>');
   -- or, for Google:
   INSERT INTO whitelist (email) VALUES ('you@example.com');
   ```

3. Open the app and **log in**. The first login creates your profile.
4. **Make yourself admin**, in the SQL Editor:

   ```sql
   UPDATE profiles SET is_admin = true WHERE discord_id = '<your Discord user id>';
   -- or: WHERE email = 'you@example.com'
   ```

   Reload the app; the admin panel appears in the menu. Add everyone else under **Admin →
   Whitelist** from now on.
5. Work through the check-list:

   - [ ] the Hub loads after login
   - [ ] **Admin → CDN** lists files (proves the MinIO key can list) and **Uploaden** works
   - [ ] a test meal or ride notification reaches you as a Discord DM (needs the bot invited)
   - [ ] the backend log has no `ERROR` lines: `docker logs ankerdcon`
   - [ ] Agenda → "Abonneren" gives a link that opens in a calendar app

---

## Updating

A code change only goes live after the **image is rebuilt**; restarting the container starts the
old image again.

- **Plain compose:** `git pull && docker compose up -d --build`.
- **Portainer:** open the stack → **Pull and redeploy** with *Re-pull image and redeploy* on.
- Run new database migrations by hand around the deploy; see
  [deployment.md](deployment.md#database-migrations) and [TODO.md](../TODO.md).
- Changing `SUPABASE_URL` or `SUPABASE_PUBLISHABLE_KEY` also needs the rebuild, since the
  frontend has them baked in. Secrets such as `SUPABASE_SECRET_KEY` only need a redeploy.

---

## When it does not work

| Symptom | Likely cause |
| --- | --- |
| The build fails with "set SUPABASE_URL" | a required value is missing from the stack's variables (compose stops on purpose) |
| The page loads but is blank, the console says the Supabase URL is missing | the image was built without `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`; set them and rebuild |
| `/api/health` works but `/` returns 404 | the frontend was not built into the image (`backend/dist` missing). Use the root `Dockerfile`, not `backend/Dockerfile`. |
| Discord login bounces back with an error | the Supabase **Callback URL** is missing from the Discord app's redirects, or the Site/Redirect URLs in step 1c do not match `APP_URL` |
| Login works but the app says "Geen toegang" | you are not on the whitelist ([step 8](#8-first-start)) |
| Saving anything fails with a foreign-key or not-null error | a migration has not been run, or the database was built from an incomplete schema |
| Saving fails with "permission denied for table" | the `service_role` grants in [1b](#1b-the-database) are missing |
| Nobody gets DMs | `DISCORD_BOT_TOKEN` is empty, or the bot is not on the members' server |
| Photo upload fails; Admin → CDN shows an error | MinIO unreachable from the container, wrong key, or the key cannot list the bucket ([minio-setup.md](minio-setup.md)) |
| Uploading a video gives HTTP 413 | the proxy's `client_max_body_size` is below 100M |
| Everyone shares one rate limit / gets 429 | the proxy is not on a private address, so the forwarded client address is ignored |

More in [operations.md](operations.md#when-something-is-wrong).
