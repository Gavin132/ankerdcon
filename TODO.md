# TODO

The living backlog: what has to happen before the next deploy, what would make
the app safer, and what would make it better. Finished items are deleted, not
ticked off — `CHANGELOG.md` and git history are the record.

- [Before the next deploy](#before-the-next-deploy)
- [Security](#security)
- [Product ideas](#product-ideas)
- [Technical debt](#technical-debt)

---

## Before the next deploy

Run these in the Supabase SQL editor, **in this order**, and only when the
matching code is (or is about to be) live. See
[docs/deployment.md](docs/deployment.md#database-migrations) for how to check
what has already been applied.

- [ ] `migration_v2.19_drop_legacy_calendar.sql` — repoints
      `expenses.linked_event_id` at `event_days`. Without it, saving an expense
      linked to an event fails with `expenses_linked_event_id_fkey`. Its last
      line drops the old `calendar` table; run only the two `ALTER TABLE`
      statements if you want to keep that table around for now.
- [ ] `migration_v2.25_settlements.sql` — the settle-up ("Afrekenen") tables.
- [ ] `migration_v2.26_settlements_one_open_per_pair.sql` — one open settlement
      per pair of members, enforced by the database.
- [ ] `migration_v2.27_drop_payment_refs.sql` — **after** the new backend is
      running; the old backend still reads the column it drops.
- [ ] Try the new root `Dockerfile` and `docker-compose.yml` (docs/installation.md) once on a
      throwaway machine: they were written but never run. Then paste the real Portainer stack
      into the "Your current stack" section of that page, secrets replaced by placeholders.
- [ ] Redeploy dev.ankerd.org **with an image rebuild**, not just a restart, so
      the backend and frontend changes go live.
- [ ] Make sure the backend's MinIO access key is allowed to *list* the bucket. The
      admin CDN page (Admin → CDN) shows an error until it can.
- [ ] For the admin quick upload of videos: raise `client_max_body_size` to 100M in the
      SWAG confs for the API (dev.ankerd.org) and cdn (see docs/minio-setup.md), and reload
      nginx. Photos are fine without it; videos over 20 MB get a 413 until then.
- [ ] Change the MinIO root password in Portainer, then test one upload. Only
      recreate the app's access key (`mc admin accesskey create`) if uploads
      fail afterwards. See [docs/minio-setup.md](docs/minio-setup.md).
- [ ] Write the 2.0 release notes into the changelog (Admin → Wijzigingslog); members
      see those, not `CHANGELOG.md`. The developer changelog is already cut as 2.0.0.
- [ ] `main` is far behind `development`; open the PR when the above is done.

## Security

### Harden "Inloggen als gebruiker" (admin impersonation)

Today an admin can mint a 2-hour token for any non-admin profile
(`POST /api/admin/impersonate/{id}`). Only admins can use it, and nothing an
ordinary member does can reach it, so the risk is a hijacked admin account or a
leaked signing secret. What to change:

- [ ] **Mark impersonation tokens.** Add a claim with the real admin's id (for
      example `act`) so the backend can tell "an admin acting as Sam" from Sam.
      Today they are indistinguishable.
- [ ] **Refuse sensitive actions in a marked session:** creating, confirming or
      withdrawing settle-up requests (payment links and IBANs), renaming a
      profile, linking or unlinking a login, and every `/api/admin` endpoint.
      This closes the worst case: acting as someone who is owed money and
      sending their debtors a payment request that points at the attacker.
- [ ] **Audit log.** A table with admin, target, time and what was done, shown
      in the admin panel. Right now the only trace is one line in the server log,
      and everything done while impersonating is recorded as the target.
- [ ] **Its own signing secret** (for example `IMPERSONATION_SECRET`) instead of
      `SUPABASE_JWT_SECRET`. Today anyone who learns that one value can forge a
      login for any user, admins included.
- [ ] **Shorter lifetime**, 30 minutes instead of 2 hours; there is no way to
      revoke a token before it expires.
- [ ] Optionally tell the impersonated member (Discord DM) when it happens.
- [ ] Turn on two-factor authentication on the Discord and Google accounts the
      admins log in with. That is the real protection against a hijacked admin.

### Other

- [ ] Restrict payment-request links further, or let an admin edit the allowed
      provider list without a deploy (today it is a constant in
      `backend/app/services/settle_up.py`).
- [ ] Rate-limit the expensive read endpoints separately (`/api/admin/cdn` lists
      the whole bucket on every call).

## Product ideas

- [ ] **Google Calendar sync.** Push events, rides and meals to a member's own
      calendar and keep them in step. Today there is a read-only `.ics`
      subscription feed (Agenda → Abonneren). Needs OAuth and a sync strategy.
- [ ] **Automatic expense import** from a bank or payment app, optional per
      member. Needs research first.
- [ ] **Delete from the admin CDN page**, removing the file and the database row
      that points at it together. The page is view-only today, and an admin cannot
      delete a story photo through the app either (only its uploader can).
- [ ] Ticket-sale overview for admins in the calendar: when tickets open, who
      has one.
- [ ] Offline queue for the other uploads (cosplay images, banners). Story
      photos survive a closed app; a cosplay image only survives while its form
      stays open.
- [ ] A monitor check that hits `/api/health` (a few bytes) instead of the home
      page, so the status page reflects the app rather than the page weight.

## Technical debt

- [ ] `db/schema.sql` is out of date: it stops at the early tables and does not
      know `events`, `event_days`, expenses, settlements, stories or cosplays. Regenerate
      it from the live database (`pg_dump --schema-only`). Until then a fresh
      project means `schema.sql` plus every migration in order, which does not
      run cleanly. See [docs/database.md](docs/database.md#a-fresh-database).
- [ ] `backend/app/routers/payments.py` and `models/payment.py` are dead code:
      not mounted, nothing calls them. Kept on purpose for now; delete when sure.
- [ ] Withdrawing a settlement puts its shares back to "pending", which also
      clears an earlier per-share "claimed". Harmless, but lossy.
- [ ] Migration file names are inconsistent (`migration_v1.1.sql` is titled v2.2
      inside, there is no v2.24). Rename or index them; see the table in
      [docs/database.md](docs/database.md#migrations).
- [ ] Frontend tests: `npm test` runs Vitest, but only the car-loading maths
      (`utils/carBalance.test.ts`) is covered. The backend has 57 tests (settle-up maths and flow, admin guards, CDN
      classification, link handling).
