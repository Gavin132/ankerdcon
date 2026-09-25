# Operations

Keeping the app running, and what to do when it misbehaves. Deploying is in
[deployment.md](deployment.md).

- [What runs where](#what-runs-where)
- [Monitoring](#monitoring)
- [Logs](#logs)
- [When something is wrong](#when-something-is-wrong)
- [Backups and recovery](#backups-and-recovery)
- [Routine chores](#routine-chores)

---

## What runs where

| Piece | Where | Notes |
| --- | --- | --- |
| The app (API + built frontend) | a container on the home server, behind SWAG and Cloudflare | `con.ankerd.org` (live), `dev.ankerd.org` (beta) |
| MinIO | a container on the same server | `cdn.ankerd.org`, bucket `story-photos`. See [minio-setup.md](minio-setup.md). |
| Supabase | hosted | Postgres and login |
| Status page | `status.ankerd.org` | uptime monitor for all ankerd projects |
| Discord | hosted | webhook and bot |

The home server is why response times on the status page look slow: see
[Monitoring](#monitoring).

## Monitoring

- **Health check:** `GET /api/health` returns `{"status": "ok", "service": "ankerd-con-api"}`
  and touches nothing else. Point an uptime monitor at it rather than at the home page. It tells
  you the process is up, not that Supabase or MinIO are.
- **Status page numbers are pessimistic.** An uptime monitor sends a brand-new request with no
  cache and no open connection, from wherever it runs, so it times the worst case every time
  (in September 2026 it showed about 2 s for the app against under 0.7 s measured directly and
  about 90 ms on an open connection). Real visitors mostly load nothing over the network: the
  app shell and every hashed asset come from the service worker, data comes from the local
  cache first, and photos carry a year-long cache header. What a member waits for is a few small
  API calls. The number that matters is a phone on 4G in another city; test that from time to
  time.
- **A screen that cannot load** shows a link to the status page (crash screen and "server
  unreachable"). Preview them under Admin → Schermen testen.

## Logs

The backend logs to stdout (`docker logs <container>` or Portainer's log view).
Levels to know:

- `ERROR` with a table name: a database call failed, and the request returned 503.
- `WARNING … Impersonation: admin X signed in as Y`: every "log in as".
- `WARNING … Auth: local token check failed`: real logins are falling back to asking Supabase
  (a missing `cryptography` package or a changed issuer). Everything still works but is slower.
- `INFO … Auth: verifying logins locally with the project's ES256 signing key` appears once
  after the first login and confirms the fast path works.

## When something is wrong

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| Half the app loads, the rest 404s; or the app will not start after a deploy | a stale `index.html` naming chunks the new build no longer has | it is `no-cache`, so a reload fixes it; if a service worker keeps the old shell, unregister it. Check the backend really serves the new `dist`. |
| Uploads spin, then fail; many 401 then 524 | an upload hung and blocked the API, or MinIO is unreachable | check MinIO first. The API times MinIO calls out after 5 and 15 seconds and runs uploads in a worker thread, so one hung upload can no longer freeze the rest. |
| Saving something fails with a foreign-key or not-null error in the log | a migration has not been run, or an old backend is still answering | check [database.md](database.md#checking-what-has-been-applied), and that only one backend runs |
| A change is deployed but behaves like the old version | the container was restarted without a rebuild | rebuild the image ([deployment.md](deployment.md#deploying)) |
| Discord messages arrive twice | two backends share one database (each runs the scheduler) | stop the extra one, often a local one pointed at production |
| Everyone gets logged out, or "Kan de server niet bereiken" | Supabase or the connection to it is down | the backend answers 503, not 401, and the app retries. Check the Supabase status page. |
| `/api/admin/cdn` shows an error | MinIO is down, or its key may not list the bucket | see [minio-setup.md](minio-setup.md) |
| A Tikkie or bank link is refused | it is outside the allowed providers | see [security.md](security.md#money-and-links) |
| Photos slow on first view only | normal: they are cached immutably after one download | nothing |

## Backups and recovery

- **Database:** use Supabase's backups (plan-dependent) and take a `pg_dump` before running a
  destructive migration such as v2.19 (drops `calendar`) or v2.27 (drops columns).
- **Photos:** MinIO's data is a Docker volume on the home server. Nothing else holds a copy, so
  back the volume up if the photos matter. The database only stores their URLs.
- **Configuration:** the environment variables and the stack definitions live in Portainer. Keep a
  copy of them somewhere safe (not in git); losing them means re-issuing every key.

## Routine chores

- Keep an eye on the reminder DMs around trips (daily 08:00, ticket checks every 15 minutes).
- After a trip, glance at Admin → CDN for files that should not be there.
- When a member leaves: deactivate or delete them under Admin → Gebruikers and remove them from
  the whitelist.
- Rotate the MinIO root password and the app's access key when in doubt; see
  [security.md](security.md#secrets).
- When `SUPABASE_JWT_SECRET` or any admin's account may have been exposed, rotate the secret and
  redeploy.
