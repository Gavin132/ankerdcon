# Local development

How to run Ankerd Con on your own machine: the FastAPI backend on
`http://localhost:8000` and the Vite frontend on `http://localhost:5173`, which
forwards every `/api` request to the backend.

- [Requirements](#requirements)
- [Fresh setup](#fresh-setup)
- [Existing install](#existing-install)
- [Running backend and frontend separately](#running-backend-and-frontend-separately)
- [Environment variables](#environment-variables)
- [Tests and checks](#tests-and-checks)
- [Things that bite](#things-that-bite)
- [Troubleshooting](#troubleshooting)

---

## Requirements

| Tool | Version | Notes |
| --- | --- | --- |
| Git | any | |
| Node.js | 18 or newer | Comes with npm |
| Python | **3.12** | 3.11 also works. **Not 3.13 or 3.14:** the pinned `pydantic==2.7.0` has no packages for those and fails to install. |
| Supabase project | | The URL and keys go into the `.env` files ([below](#environment-variables)) |

Discord and MinIO (story photos) are optional for local development.

---

## Fresh setup

### Windows (PowerShell)

**1. Install the tools** (skip what you already have):

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install Python.Python.3.12
```

Open a new terminal afterwards so the new commands are found.

**2. Get the code:**

```powershell
git clone https://github.com/Gavin132/ankerdcon.git
cd ankerdcon
```

**3. Create the env files** and fill in the values ([what goes where](#environment-variables)):

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

The file names must start with a dot: `.env`, not `env`. Without the dot the
frontend won't find them, and git won't ignore them.

**4. Allow local scripts** (once per Windows user):

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**5. Install everything and start the app:**

```powershell
.\dev.ps1 -Install
```

This creates `.venv` with Python 3.12, installs the backend packages, runs
`npm ci` for the frontend, and then starts both. Open the URL Vite prints,
normally `http://localhost:5173`. **Ctrl+C** stops both.

<details>
<summary>The same steps without the script</summary>

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
cd frontend
npm ci
cd ..
```

Then start both as described in
[Running backend and frontend separately](#running-backend-and-frontend-separately).

</details>

### macOS / Linux

```bash
# 1. Tools — macOS with Homebrew (on Linux use your package manager)
brew install git node python@3.12

# 2. Code
git clone https://github.com/Gavin132/ankerdcon.git
cd ankerdcon

# 3. Env files, then fill in the values
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 4. Install everything and start the app
chmod +x dev.sh
./dev.sh --install
```

### Database

Use a Supabase project you can afford to break, or the project the group runs on.
Setting up a brand-new project is not one file any more: see
[database.md](database.md#a-fresh-database). Access is invite-only: put your
Discord ID (or Google email) in the `whitelist` table before you log in, as
described in [security.md](security.md#the-whitelist).

---

## Existing install

**Start the app** (Windows / macOS / Linux):

```powershell
.\dev.ps1
```

```bash
./dev.sh
```

**After pulling new changes**, update the dependencies. This is safe to run any
time; it only installs what changed:

```powershell
git pull
.\dev.ps1 -Install
```

```bash
git pull
./dev.sh --install
```

**New database migrations:** if the pull added files to `db/migrations/`, run the
new ones in the Supabase SQL editor, in version order. Some must run *after*
the new code is live; each file says so at the top (see
[deployment.md](deployment.md#database-migrations)).

**Your `.venv` uses the wrong Python** (for example it was created with 3.14):
delete it and let the script recreate it.

```powershell
Remove-Item -Recurse -Force .venv
.\dev.ps1 -Install
```

---

## Running backend and frontend separately

Useful when you want each one's output in its own terminal, or to restart only one.

**Terminal 1: backend**

```powershell
.\.venv\Scripts\Activate.ps1
cd backend
uvicorn main:app --reload
```

On macOS / Linux: `source .venv/bin/activate`, then the same two commands.
Set `API_DOCS_ENABLED=true` in `backend/.env` if you want the interactive API
docs at `http://localhost:8000/api/docs`; they are off by default.

**Terminal 2: frontend**

```powershell
cd frontend
npm run dev
```

---

## Environment variables

### `frontend/.env`

| Variable | Required | Where to find it |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | yes | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase → Settings → API → publishable (anon) key. Never the secret key. |
| `VITE_API_URL` | no | Leave empty locally; the Vite proxy handles `/api` |
| `BACKEND_URL` | no | Where the dev proxy sends `/api`. Default `http://localhost:8000` |

### `backend/.env`

| Variable | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Same project URL as the frontend |
| `SUPABASE_SECRET_KEY` | yes | Supabase → Settings → API → secret key. Keep it out of the frontend. |
| `SUPABASE_JWT_SECRET` | for "log in as" | Signs and checks admin "log in as" tokens and seeds the calendar feed link. Real logins do not need it: they are checked against the project's published ES256 key. |
| `CORS_ORIGINS` | no | Comma-separated. Defaults to `http://localhost:5173` |
| `DISCORD_WEBHOOK_URL` | no | The group's Discord channel (shared posts) |
| `DISCORD_BOT_TOKEN` | no | Personal DMs. Without it no DM is sent. |
| `APP_URL` | no | The app's public URL, used for links in Discord messages |
| `CALENDAR_FEED_TOKEN` | no | Secret in the `.ics` subscription link. Empty derives it from `SUPABASE_JWT_SECRET`; set a new value to invalidate every shared link. |
| `API_DOCS_ENABLED` | no | `true` shows `/api/docs`. Keep `false` anywhere reachable from the internet. |
| `RATE_LIMIT_PER_MINUTE` | no | Requests per client per minute before a 429 (default 600; writes get a quarter of it) |
| `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_SECURE` | for photos | Host only for the endpoint (no `https://`). Bucket defaults to `story-photos`. See [minio-setup.md](minio-setup.md). Without them everything works except uploads and the admin CDN page. |

### Build-time variables (frontend)

Read by `frontend/vite.config.ts`, not exposed to the browser.

| Variable | Effect |
| --- | --- |
| `APP_ENV=dev` | builds the dev variant: orange launcher icon and manifest |
| `ALLOWED_HOST` | host name the dev server accepts (default `localhost`) |
| `BACKEND_URL` | where the dev proxy sends `/api` (default `http://localhost:8000`) |
| `PORT` | dev server port (default 5173) |

The **app version** comes from `backend/VERSION`; bump it there only. Both the
API and the frontend build read that file.

--- | --- | --- |
| `SUPABASE_URL` | yes | Same project URL as the frontend |
| `SUPABASE_SECRET_KEY` | yes | Supabase → Settings → API → secret key. Keep this out of the frontend. |
| `SUPABASE_JWT_SECRET` | recommended | Signs and checks admin "log in as" tokens, and seeds the calendar feed link. Real logins don't need it: they're checked against the project's published ES256 key |
| `CORS_ORIGINS` | no | Defaults to `http://localhost:5173` |
| `DISCORD_WEBHOOK_URL`, `DISCORD_BOT_TOKEN`, `APP_URL` | no | Discord notifications and DMs |
| `MINIO_*` | no | Story photo uploads; see `docs/minio-setup.md` |

---

## Tests and checks

| Where | Command | What |
| --- | --- | --- |
| `backend/` | `python -m pytest` | 57 tests: settle-up maths and flow, admin guards, link handling, CDN classification. They run against an in-memory stand-in for Supabase and need no network. Install the tools with `pip install -r backend/requirements-dev.txt`. |
| `frontend/` | `npx tsc --noEmit` | type-check |
| `frontend/` | `npm run build` | type-check plus production build. Output goes to `backend/dist` (gitignored), which the backend then serves. |
| `frontend/` | `npm test` | Vitest. One test file so far: the car-loading maths in `src/utils/carBalance.test.ts`. |
| `frontend/` | `npm run lint` | ESLint |

There are hardly any frontend tests. To look at a component in isolation without
logging in, render it from a throwaway page with its data preloaded into a
`QueryClient` (`queryClient.setQueryData(QUERY_KEYS.users, [...])`) and delete
the page afterwards.

---

## Things that bite

- **Restart the backend after changing it.** `--reload` has been unreliable on
  Windows: a change can be missed and the old code keeps answering (routes that
  exist in the code return 404, fixed bugs stay). If behaviour does not match
  the code, stop the server and start it again. Also check that only **one**
  process listens on port 8000: on Windows two can bind the same port and split
  requests between old and new code.
- **Tailwind config changes need a restart of the frontend dev server.** Editing
  `tailwind.config.ts` (fonts, colours) is not picked up by hot reload.
- **A local backend uses the database in its `.env`.** Points at production? Then
  everything you save is real, and its reminder scheduler can DM real people
  (see the heads-up at the bottom).
- **Log in on localhost separately.** It is a different site from ankerd.org, so
  no session carries over, and Supabase must list `http://localhost:5173` under
  its allowed redirect URLs or the login bounces back.
- **The service worker only exists in production builds.** If you test a build
  served by the backend, an old worker can keep serving the previous build:
  unregister it in the browser's devtools (Application → Service workers).

---

## Troubleshooting

**`.\dev.ps1` "cannot be loaded because running scripts is disabled"**
Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or start it with
`powershell -ExecutionPolicy Bypass -File .\dev.ps1`.

**`pip install` fails while building `pydantic-core` (Rust / `link.exe` errors)**
The virtual environment uses Python 3.13 or newer. Install Python 3.12, delete
`.venv`, and run `.\dev.ps1 -Install` again.

**"Missing required environment variable: VITE_SUPABASE_URL"**
`frontend/.env` is missing, misnamed (`env` without the dot), or incomplete.

**"Kan de server niet bereiken" or every `/api` request fails**
The backend isn't running or crashed during startup. Check its output (or use
`dev.ps1`, which waits for it before starting the frontend).

**"Port 8000 is already in use"**
A backend is still running, usually in another terminal. Stop that one first.
If port 5173 is taken, Vite automatically uses the next free port and prints it.

**Heads-up: reminders.** The backend starts the reminder scheduler (daily at 08:00,
plus ticket checks every 15 minutes) against whichever Supabase project is in
`backend/.env`. If that's the production database and production runs its own
backend too, leaving a local backend running can send duplicate Discord DMs.
