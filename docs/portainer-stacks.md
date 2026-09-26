# The Portainer stacks

The two stacks the app runs from on the home server (live and beta), how they differ, and
what to change in the live one before it goes to 2.0. Secrets are not here: every value is a
`${VARIABLE}` filled in from the stack's own **Environment variables** in Portainer.

- [How a stack works](#how-a-stack-works)
- [Live stack (v1.8, as it runs now)](#live-stack-v18-as-it-runs-now)
- [Beta stack (v2.0)](#beta-stack-v20)
- [What differs](#what-differs)
- [Recommended live stack for 2.0](#recommended-live-stack-for-20)
- [Order of a release](#order-of-a-release)

---

## How a stack works

Three containers run one after the other, sharing a volume that holds a checkout of the repository:

1. **`*-repo-cloner`** (Alpine + git) clones the branch into the volume, or updates an existing
   checkout, and exits.
2. **`*-frontend-builder`** (Node) runs `npm install && npm run build` in `frontend/`. The build lands in
   `backend/dist` inside the volume. It exits.
3. **`*-backend`** (Python) installs `requirements.txt` and starts `uvicorn`, which serves the API and
   the built frontend from the same volume. This is the only container that keeps running.

`depends_on: condition: service_completed_successfully` makes each step wait for the previous one.
If one step fails, the next never starts.

Consequences worth knowing:

- **There is no image to rebuild.** Code changes go live when the stack is **updated/redeployed**
  (Portainer → Stacks → the stack → *Update the stack*, or *Pull and redeploy*), because that re-runs
  the cloner and the builder. **Restarting only the backend container does not:** it starts `uvicorn`
  on whatever is already in the volume. (The root `Dockerfile` in the repository, which does
  build an image, is a separate option; see [installation.md](installation.md).)
- **`VITE_*` values are read by the builder**, so changing them needs a redeploy of the stack too.
- Every start of the backend runs `apt-get update`, `apt-get install git` and `pip install`, so it needs
  internet and takes a minute or two before the site answers.
- The backend runs as **root** inside its container (the stock Python image), and the checkout, including
  `node_modules`, lives in the volume.

---

## Live stack (v1.8, as it runs now)

```yaml
version: '3.8'

services:
  con-repo-cloner:
    image: alpine:latest
    container_name: con-ankerdcon-cloner
    volumes:
      - con_ankerdcon_data:/app
    working_dir: /app
    environment:
      - GIT_BRANCH=${GIT_BRANCH:-main}
    command: >
      sh -c "apk add --no-cache git &&
             git config --global safe.directory '*' &&
             if [ ! -d 'ankerdcon/.git' ]; then
               echo 'No valid git repo found. Cleaning up and cloning branch ${GIT_BRANCH:-main}...';
               rm -rf ankerdcon;
               git clone -b ${GIT_BRANCH:-main} https://github.com/Gavin132/ankerdcon.git;
             else
               echo 'Repository exists, fetching and switching to branch ${GIT_BRANCH:-main}...';
               cd ankerdcon &&
               git fetch origin &&
               git checkout ${GIT_BRANCH:-main} &&
               git pull origin ${GIT_BRANCH:-main};
             fi"

  con-frontend-builder:
    image: node:18-alpine
    container_name: con-ankerdcon-frontend-builder
    depends_on:
      con-repo-cloner:
        condition: service_completed_successfully
    volumes:
      - con_ankerdcon_data:/app
    working_dir: /app/ankerdcon/frontend
    environment:
      VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
      VITE_SUPABASE_PUBLISHABLE_KEY: ${VITE_SUPABASE_PUBLISHABLE_KEY}
    command: sh -c "npm install && npm run build"

  con-backend:
    image: python:3.11-slim
    container_name: con-backend
    depends_on:
      con-frontend-builder:
        condition: service_completed_successfully
    ports:
      - "8001:8000"
    volumes:
      - con_ankerdcon_data:/app
    working_dir: /app/ankerdcon/backend
    environment:
      DISCORD_WEBHOOK_URL: ${DISCORD_WEBHOOK_URL}
      DISCORD_BOT_TOKEN: ${DISCORD_BOT_TOKEN}
      APP_URL: ${APP_URL}
      CORS_ORIGINS: ${CORS_ORIGINS}
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_SECRET_KEY: ${SUPABASE_SECRET_KEY}
      SUPABASE_JWT_SECRET: ${SUPABASE_JWT_SECRET}
      MINIO_ENDPOINT: ${MINIO_ENDPOINT}
      MINIO_BUCKET: ${MINIO_BUCKET}
      MINIO_SECURE: true
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
    command: >
      sh -c "apt-get update && apt-get install -y git &&
             pip install --no-cache-dir -r requirements.txt &&
             uvicorn main:app --host 0.0.0.0 --port 8000"

volumes:
  con_ankerdcon_data:
    name: con_ankerdcon_data
```

## Beta stack (v2.0)

```yaml
version: '3.8'

services:
  dev-repo-cloner:
    image: alpine:latest
    container_name: dev-ankerdcon-cloner
    volumes:
      - dev_ankerdcon_data:/app
    working_dir: /app
    environment:
      GIT_BRANCH: ${GIT_BRANCH:-main}
    command: sh -c "apk add --no-cache git && git config --global safe.directory '*' && if [ ! -d 'ankerdcon/.git' ]; then rm -rf ankerdcon; git clone -b $$GIT_BRANCH https://github.com/Gavin132/ankerdcon.git; else cd ankerdcon && git fetch origin $$GIT_BRANCH && git checkout -f $$GIT_BRANCH && git reset --hard origin/$$GIT_BRANCH; fi"
  dev-frontend-builder:
    image: node:18-alpine
    container_name: dev-ankerdcon-frontend-builder
    depends_on:
      dev-repo-cloner:
        condition: service_completed_successfully
    volumes:
      - dev_ankerdcon_data:/app
    working_dir: /app/ankerdcon/frontend
    environment:
      VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
      VITE_SUPABASE_PUBLISHABLE_KEY: ${VITE_SUPABASE_PUBLISHABLE_KEY}
      APP_ENV: dev
    command: sh -c "npm install && npm run build"

  dev-backend:
    image: python:3.11-slim
    container_name: dev-con-backend
    depends_on:
      dev-frontend-builder:
        condition: service_completed_successfully
    ports:
      - "8002:8000"
    volumes:
      - dev_ankerdcon_data:/app
    working_dir: /app/ankerdcon/backend
    environment:
      DISCORD_WEBHOOK_URL: ${DISCORD_WEBHOOK_URL}
      DISCORD_BOT_TOKEN: ${DISCORD_BOT_TOKEN}
      APP_URL: ${APP_URL}
      CORS_ORIGINS: ${CORS_ORIGINS}
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_SECRET_KEY: ${SUPABASE_SECRET_KEY}
      SUPABASE_JWT_SECRET: ${SUPABASE_JWT_SECRET}
      MINIO_ENDPOINT: ${MINIO_ENDPOINT}
      MINIO_BUCKET: ${MINIO_BUCKET}
      MINIO_SECURE: true
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
    command: >
      sh -c "apt-get update && apt-get install -y git &&
             pip install --no-cache-dir -r requirements.txt &&
             uvicorn main:app --host 0.0.0.0 --port 8000"

volumes:
  dev_ankerdcon_data:
    name: dev_ankerdcon_data
```

---

## What differs

| | Live | Beta | Matters? |
| --- | --- | --- | --- |
| Names, volume, host port | `con-…`, `con_ankerdcon_data`, **8001** | `dev-…`, `dev_ankerdcon_data`, **8002** | intended: the SWAG confs point at these ports |
| Default branch | `main` (`GIT_BRANCH`) | `main`, set to `development` in the stack's variables | intended |
| Build variant | none | `APP_ENV: dev` (orange icon and title) | intended: the live build must not have it |
| **Updating the checkout** | `git checkout` + `git pull` | `git fetch` + `git checkout -f` + `git reset --hard` | **yes, see below** |
| Everything else | identical | identical | Node 18, Python 3.11, `npm install`, no restart policy, same variables |

**The difference that matters is the cloner.** `git pull` stops with an error when the checkout has a
local change, and `npm install` is a classic way to get one: it rewrites `package-lock.json`. The
cloner then exits with an error, the builder and backend never start, and the redeploy leaves the
site **down**. The beta's `fetch` + `reset --hard` cannot get stuck like that (it is the fix described in
[deployment.md](deployment.md#deploying)). The live stack has not had it yet, so change it before the
live stack moves from 1.8 to 2.0, which is a large jump.

**No new variables are needed for 2.0.** Both stacks already pass everything the backend requires.
Optional ones with sane defaults are left out: `CALENDAR_FEED_TOKEN` (empty = derived from
`SUPABASE_JWT_SECRET`), `RATE_LIMIT_PER_MINUTE` (600) and `API_DOCS_ENABLED` (off). Set
`CALENDAR_FEED_TOKEN` if you want to be able to invalidate calendar links without rotating the JWT secret.

Other things in both stacks that are worth fixing, roughly in order:

1. **Node 18 is end-of-life, and the frontend's Supabase packages ask for Node 20 or newer.** `npm install`
   only warns, and the build works today, but use `node:20-alpine`.
2. **`npm install` → `npm ci`.** It installs exactly what `package-lock.json` says, is faster, and never
   rewrites the lockfile (which is what made `git pull` fail).
3. **No `restart:` on the backend.** If the server reboots, the backend does not come back until someone
   redeploys. `restart: unless-stopped` fixes that. Do not put it on the cloner or builder: they are one-shot.
4. **No health check**, so Portainer cannot tell "still installing" from "running". The backend answers
   `/api/health` a minute or two after start.
5. `version: '3.8'` is obsolete (compose ignores it with a warning) and `apt-get install git` looks
   unnecessary (nothing in `requirements.txt` comes from git). Both are harmless; drop them when convenient.
6. The backend runs as root here. Fine on a home server behind a proxy, but it is not the "runs as a normal
   user" the root `Dockerfile` has.

---

## Recommended live stack for 2.0

The live stack with the beta's cloner, Node 20, `npm ci`, a restart policy and a health check. Nothing
else changes: names, ports, volume and variables stay as they are, so the SWAG confs and the stack's
environment variables keep working. Try the same edits on the beta stack first.

```yaml
services:
  con-repo-cloner:
    image: alpine:latest
    container_name: con-ankerdcon-cloner
    volumes:
      - con_ankerdcon_data:/app
    working_dir: /app
    environment:
      GIT_BRANCH: ${GIT_BRANCH:-main}
    command: sh -c "apk add --no-cache git && git config --global safe.directory '*' && if [ ! -d 'ankerdcon/.git' ]; then rm -rf ankerdcon; git clone -b $$GIT_BRANCH https://github.com/Gavin132/ankerdcon.git; else cd ankerdcon && git fetch origin $$GIT_BRANCH && git checkout -f $$GIT_BRANCH && git reset --hard origin/$$GIT_BRANCH; fi"

  con-frontend-builder:
    image: node:20-alpine
    container_name: con-ankerdcon-frontend-builder
    depends_on:
      con-repo-cloner:
        condition: service_completed_successfully
    volumes:
      - con_ankerdcon_data:/app
    working_dir: /app/ankerdcon/frontend
    environment:
      VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
      VITE_SUPABASE_PUBLISHABLE_KEY: ${VITE_SUPABASE_PUBLISHABLE_KEY}
    command: sh -c "npm ci && npm run build"

  con-backend:
    image: python:3.11-slim
    container_name: con-backend
    restart: unless-stopped
    depends_on:
      con-frontend-builder:
        condition: service_completed_successfully
    ports:
      - "8001:8000"
    volumes:
      - con_ankerdcon_data:/app
    working_dir: /app/ankerdcon/backend
    environment:
      DISCORD_WEBHOOK_URL: ${DISCORD_WEBHOOK_URL}
      DISCORD_BOT_TOKEN: ${DISCORD_BOT_TOKEN}
      APP_URL: ${APP_URL}
      CORS_ORIGINS: ${CORS_ORIGINS}
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_SECRET_KEY: ${SUPABASE_SECRET_KEY}
      SUPABASE_JWT_SECRET: ${SUPABASE_JWT_SECRET}
      MINIO_ENDPOINT: ${MINIO_ENDPOINT}
      MINIO_BUCKET: ${MINIO_BUCKET}
      MINIO_SECURE: true
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4)"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 180s
    command: >
      sh -c "apt-get update && apt-get install -y git &&
             pip install --no-cache-dir -r requirements.txt &&
             uvicorn main:app --host 0.0.0.0 --port 8000"

volumes:
  con_ankerdcon_data:
    name: con_ankerdcon_data
```

For the beta stack, use the same file with `dev` names, port `8002` and `APP_ENV: dev` under the builder's
`environment`. In both, `GIT_BRANCH` in the stack's variables decides the branch: `main` for live,
`development` for beta.

The `python:3.11-slim` image should work: the backend's syntax was checked against 3.11 (it is developed and tested on 3.12, and its tests were not run on 3.11). Whichever you pick, keep the two stacks on the same version.

---

## Order of a release

1. **Beta first.** Apply the changes above to the beta stack, *Update the stack* with `GIT_BRANCH=development`,
   wait for the backend health check, and test on dev.ankerd.org.
2. **Migrations** from [TODO.md](../TODO.md), following the order and "before/after the deploy" notes in
   [deployment.md](deployment.md#database-migrations). If live and beta **share one Supabase project**, everything
   applied for beta is already live for the 1.8 app, so check each migration's header against what 1.8 uses
   before running it. With separate projects, run them against each project when that stack is updated.
3. Open the pull request `development` → `main` and merge it.
4. **Live stack:** replace it with the recommended one above and *Update the stack* (with `GIT_BRANCH=main`).
   Open the site, hard-refresh, log in.
5. Migrations that must run **after** the new code (v2.27).
6. Enter the release notes in Admin → Wijzigingslog (members see those, not `CHANGELOG.md`).
7. Add `client_max_body_size 100M;` to the SWAG confs for the app and the CDN, and reload nginx.
