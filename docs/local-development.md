# Local development

How to run Ankerd Con on your own machine: the FastAPI backend on
`http://localhost:8000` and the Vite frontend on `http://localhost:5173`, which
forwards every `/api` request to the backend.

- [Requirements](#requirements)
- [Fresh setup](#fresh-setup)
- [Existing install](#existing-install)
- [Running backend and frontend separately](#running-backend-and-frontend-separately)
- [Environment variables](#environment-variables)
- [Other useful commands](#other-useful-commands)
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

For a brand-new Supabase project, run `db/schema.sql` in the Supabase SQL
editor. Access is invite-only: add your Discord ID to the `whitelist` table
(see the README) before you log in.

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
new ones in the Supabase SQL editor, in version order, before starting the app.

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
The interactive API docs are at `http://localhost:8000/docs`.

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
| `SUPABASE_SECRET_KEY` | yes | Supabase → Settings → API → secret key. Keep this out of the frontend. |
| `SUPABASE_JWT_SECRET` | recommended | Signs and checks admin "log in as" tokens, and seeds the calendar feed link. Real logins don't need it: they're checked against the project's published ES256 key |
| `CORS_ORIGINS` | no | Defaults to `http://localhost:5173` |
| `DISCORD_WEBHOOK_URL`, `DISCORD_BOT_TOKEN`, `APP_URL` | no | Discord notifications and DMs |
| `MINIO_*` | no | Story photo uploads; see `docs/minio-setup.md` |

---

## Other useful commands

Run these from `frontend/`:

| Command | What it does |
| --- | --- |
| `npx tsc --noEmit` | Type-check the frontend |
| `npm run build` | Production build. Output goes to `backend/dist`, which is gitignored. |

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

**Every `/api` request returns 500, or the app shows "Kan de server niet bereiken"**
The backend isn't running or crashed during startup. Check its output (or use
`dev.ps1`, which waits for it before starting the frontend).

**"Port 8000 is already in use"**
A backend is still running, usually in another terminal. Stop that one first.
If port 5173 is taken, Vite automatically uses the next free port and prints it.

**Heads-up: reminders.** The backend starts the reminder scheduler (daily at 08:00,
plus ticket checks every 15 minutes) against whichever Supabase project is in
`backend/.env`. If that's the production database and production runs its own
backend too, leaving a local backend running can send duplicate Discord DMs.
