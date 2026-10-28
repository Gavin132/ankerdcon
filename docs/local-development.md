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

For a Docker install, every value and where to get it is in [installation.md](installation.md).

### `frontend/.env`

| Variable | Required | Where to find it |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | yes | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase → Settings → API → publishable (anon) key. Never the secret key. |
| `VITE_API_URL` | no | Leave empty locally; the Vite proxy handles `/api` |
| `BACKEND_URL` | no | Where the dev proxy sends `/api`. Default `http://localhost:8000` |
| `VITE_VAPID_PUBLIC_KEY` | no | Same value as the backend's `VAPID_PUBLIC_KEY`. Without it, push is simply not offered. |

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
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | for push | Generated once, never rotated — see [deployment.md#web-push](deployment.md#web-push). Without them, push is simply not offered. |

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

## Mock mode

The app on made-up data, signed in as nobody, so every screen can be opened at a phone size without a login, the
backend or a database. **Development only** (`npm run dev`): `main.tsx` loads `src/dev/` behind
`import.meta.env.DEV`, so a production build has none of it, and nothing it does reaches a server.

Open `http://localhost:5173/?mock`, and add what you want:

| Option | Values | What it does |
| --- | --- | --- |
| `scenario` | `upcoming` (default), `live`, `past` | where the main trip (HMIA 2026 Brussel, three days) stands: coming up, on right now (day two is today), or over |
| `role` | `member` (default), `admin`, `viewer` | who is signed in: an ordinary member, an admin (admin pages, extra buttons) or a read-only member |
| `delay` | milliseconds | holds every answer back, to see loading and skeleton states |

For example `/finance?mock&scenario=live&role=admin&delay=800`. The tab remembers the options (sessionStorage), so
reloading or typing another path stays in mock mode; close the tab to leave it.

What is where:

- `src/dev/mock/fixtures.ts`: the data, typed with the app's own types. It is deliberately awkward: a very long name
  and activity title, a full car, a trip only some people attend, an empty list, so layouts meet what real data
  does. Dates are counted from today. `fixtures.test.ts` keeps it consistent (everyone named exists, links point at
  something, seat counts add up).
- `src/dev/mock/adapter.ts`: answers requests (it replaces axios's network adapter). A read with no entry answers
  `[]` and is listed in `window.__mock.unhandled`; a change is accepted and forgotten, the next read shows the fixtures
  again. Add a line to `GETS` when a new screen needs data.
- `src/lib/mockMode.ts`: the one flag the rest of the app knows. It keeps the sign-in listener quiet and keeps made-up
  data out of the saved query cache.

### The mobile audit

`npm run mobile-audit` opens every screen listed in `scripts/audit-screens.mjs` in mock mode at phone widths, runs
the layout check in `src/dev/audit.ts` (`window.__audit()`, also usable from the console) and writes
`playwright-out/audit/report.md` with a screenshot of every screen. It looks for:

| Finding | Severity | What it means |
| --- | --- | --- |
| `clipped-text` | error | text an `overflow: hidden` parent cuts off, even by a pixel |
| `clipped-box` | warn | a control, icon or picture an `overflow: hidden` parent shaves a corner, ring or badge off |
| `offscreen`, `page-scrolls-sideways` | error / warn | text or a box past the screen edge; the page scrolls sideways |
| `broken-image` | error | a picture that did not load |
| `small-tap-target` | warn (info from 40 px) | a control under 44×44 px, counting the invisible `hit-area` box |
| `small-text` | info | text under 12 px |
| `truncated` | info | text shortened with "…" (one line or `line-clamp`), which is on purpose |

A scroll box is not a problem (what is inside it can be reached), and neither is an ellipsis; both are only mentioned.

```bash
npm run mobile-audit                          # 320 and 390 px, light, "upcoming"
npm run mobile-audit -- --full                # 320 360 390 430 px, light and dark, all three scenarios
npm run mobile-audit -- --only trip,finance   # screens whose name contains one of these
npm run mobile-audit -- --info                # also the small text and the truncations
npm run mobile-audit -- --browser webkit      # Safari's engine
npm run mobile-audit -- --selftest            # checks the check itself on deliberately broken elements
```

It needs the dev server and a Playwright browser (`npx playwright install chromium`); if only an older Chromium is
installed it uses that. The exit code is 1 when there are errors. **Run it after changing layout, and add a screen to
`audit-screens.mjs` for a new page or sheet.** It finds what can be measured; it cannot tell that something looks
odd, so also look at the screenshots.

## Testing in WebKit (iPhone)

Without an iPhone, `npm run ios-check` (in `frontend/`) opens the running app in Playwright's
WebKit, the engine Safari uses, with an iPhone profile. It prints script errors, console errors and
failed requests, says whether the "Ankerd Con kan niet starten" screen showed, and saves a screenshot
to `frontend/playwright-out/` (git-ignored).

```bash
npm run ios-check                                  # the login page of http://localhost:5173
npm run ios-check -- /trips                        # another path
npm run ios-check -- / --device "iPhone SE" --url https://dev.ankerd.org
npm run ios-check -- --list                        # device names
```

It is WebKit, not iOS: no Safari toolbar, no safe-area insets, no home-screen app, and only a recent
WebKit version. It finds Safari-only script and layout problems and phone-size breakage; anything
about a specific iOS version needs a real device or a cloud device service (BrowserStack). The
browser is installed once with `npx playwright install webkit`. For your own interaction tests,
import `webkit` and `devices` from `playwright` as the script does: `page.tap()` for taps,
`page.mouse` for drags, `page.goBack()` for the back gesture.

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
