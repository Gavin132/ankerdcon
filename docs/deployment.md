# Deployment

How a change gets from `development` to the running app. The infrastructure itself
(Portainer stacks, SWAG, Cloudflare, DDNS) lives on the home server and is not in
this repository; this page says what the repository needs from it. Setting up a new
install from nothing is in [installation.md](installation.md), which also has a
`docker-compose.yml` you can use as a Portainer stack.

- [Environments](#environments)
- [What gets built](#what-gets-built)
- [Environment variables](#environment-variables)
- [Deploying](#deploying)
- [Database migrations](#database-migrations)
- [Releasing](#releasing)
- [Rolling back](#rolling-back)
- [Checklist](#checklist)

---

## Environments

| | Branch | URL | Notes |
| --- | --- | --- | --- |
| Live | `main` | `con.ankerd.org` | the released state |
| Beta | `development` | `dev.ankerd.org` | where changes are tried first; built with `APP_ENV=dev` (orange icon) |
| Local | any | `localhost:5173` | [local-development.md](local-development.md) |

Both hosted environments use the **same code layout** and their own environment variables
and, if you want them apart, their own Supabase project. The branch a stack deploys is set by
the `GIT_BRANCH` variable of its clone step (below).

## What gets built

Two artefacts end up in one container:

1. **The frontend build.** `cd frontend && npm ci && npm run build` writes to
   `backend/dist/`. That folder is **git-ignored**, so it exists only where the build ran.
2. **The backend image.** `backend/Dockerfile` (Python 3.12 slim, runs as an unprivileged
   user, `uvicorn main:app --host 0.0.0.0 --port 8000`) copies everything in `backend/`,
   including `dist/`. `.dockerignore` keeps `.env` out of the image.

If `backend/dist` is missing the API still runs, but serves no frontend. The link-preview
routes and the SPA fallback are only registered when it exists.

The version shown in the app (and used to invalidate caches) is **`backend/VERSION`**.

## Environment variables

Passed to the container at runtime (Portainer stack "Environment variables"), never baked
into the image. The full list with explanations is in
[local-development.md](local-development.md#environment-variables).

Required in production:

| Variable | Notes |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | the project's URL and **secret** key |
| `SUPABASE_JWT_SECRET` | needed for "log in as"; see [security.md](security.md#secrets) |
| `CORS_ORIGINS` | the site's own origin(s), comma-separated |
| `APP_URL` | public URL, used in Discord messages |
| `DISCORD_BOT_TOKEN`, `DISCORD_WEBHOOK_URL` | notifications; without the token no DM is sent (easy to forget in Portainer) |
| `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_SECURE` | photo storage and the admin CDN page |
| `CALENDAR_FEED_TOKEN` | optional; set it so the calendar links do not depend on the JWT secret |

Keep `API_DOCS_ENABLED` unset (off).

The frontend needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` **at build time**;
they are baked into the bundle, so changing them means rebuilding. `VITE_API_URL` stays empty
because the frontend is served from the same origin as the API.

## Deploying

A code change only goes live after the **image is rebuilt**. Restarting the container starts
the old image again. The usual flow with the clone step in Portainer:

```yaml
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
```

- It clones the branch into a volume the first time, and afterwards **hard-resets** to
  `origin/<branch>`. A `git pull` would abort on any local change in the volume (a rewritten
  lockfile was the classic cause) and the container would exit. The reset always makes the
  checkout match GitHub; untracked files such as a `.env` are left alone. Do not edit tracked
  files in the volume.
- Set `GIT_BRANCH` to `development` for the beta stack and `main` for live. The default is `main`.
- After the clone step, the stack has to **build the frontend and the image** from that checkout
  (see [What gets built](#what-gets-built)) and start the app container.

Steps for a normal change:

1. Merge or push to the branch the stack follows.
2. Run any new migrations that must go *before* the code (see below).
3. Redeploy the stack **with a rebuild**.
4. Run any migrations that must go *after* the code.
5. Open the site, log in, and look at the thing you changed. A hard refresh drops a stale service
   worker.

## Database migrations

Files in `db/migrations/` are run **by hand** in the Supabase SQL editor. There is no migration
runner and no record of what ran, so be deliberate:

1. See what is new: compare the folder with [database.md](database.md#migrations) and the
   [checks](database.md#checking-what-has-been-applied), and read [TODO.md](../TODO.md).
2. Read the header of each new file. Most are additive and safe to run before or after the code.
   Some are not:
   - **Run after the new code is live** when the old code still uses what the migration removes
     (for example `v2.27` drops a column the previous backend reads).
   - **Run after the release that stops using a path** when the migration closes it
     (`v2.22`).
   - **Take a backup first** for anything that drops a table or column (`v2.19`, `v2.27`).
3. Run them in file order, one file at a time. They are written to be safe to run twice.
4. Verify with the matching check, and tick it off in `TODO.md`.

If the code expects a column or table that is not there, saving something fails with a foreign-key
or not-null error in the backend log; that is the signature of "a migration has not been run".

## Releasing

1. Bump `backend/VERSION` (the one source of the version; `frontend/package.json` carries the
   same number for tooling). A new version also invalidates every member's cached data and
   offers them the update banner.
2. Move `[Unreleased]` in `CHANGELOG.md` under the new version and date.
3. Write the **release notes members see** in Admin → Wijzigingslog. They are stored in the database
   and are separate from `CHANGELOG.md`, which is for developers.
4. Merge `development` into `main` (a pull request), deploy live as above, and tag the release.
5. Mention anything members must do, in an announcement if it matters.

## Rolling back

- **Code:** point the stack's branch or image back at the previous commit and rebuild. Members'
  browsers pick the older build up through the same update flow.
- **Database:** migrations are not reversible by the app. That is why destructive ones need a
  backup first. Most are additive, so an old backend keeps working with the newer schema; the
  exceptions are the "drop" migrations, so do those last.
- **A bad service worker:** it is replaced on the next visit; if a device is stuck, clearing site
  data (or unregistering the worker in devtools) fixes it.

## Checklist

Before deploying:

- [ ] `python -m pytest` in `backend/` passes
- [ ] `npx tsc --noEmit` and `npm run build` in `frontend/` pass
- [ ] new env variables are set in the stack
- [ ] new migrations are read, and the order relative to the deploy is decided
- [ ] `CHANGELOG.md` and the docs are updated

After deploying:

- [ ] `GET /api/health` answers
- [ ] you can log in and load the Hub
- [ ] the thing you changed works, on a phone if it is visual
- [ ] the backend log has no new `ERROR` lines
