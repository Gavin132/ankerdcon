# Database

Postgres on Supabase. Only the backend talks to it (see
[architecture.md](architecture.md#one-backend-in-front-of-everything)).

- [Conventions](#conventions)
- [Tables](#tables)
- [Relationships](#relationships)
- [Migrations](#migrations)
- [Checking what has been applied](#checking-what-has-been-applied)
- [A fresh database](#a-fresh-database)
- [Storage](#storage)

---

## Conventions

- **Service role only.** Every table has row-level security **on** and **no
  policies**, and the `service_role` has all privileges. The backend connects with
  the secret key; nothing else can read or write. A table created with a raw
  `CREATE TABLE` gets no grants automatically, so a migration that creates a table
  must also `GRANT ALL ON <table> TO service_role` (that is what the `…b_grants`
  migrations fix).
- **Ids** are UUIDs (`gen_random_uuid()`), except `story_seen`, which is keyed by
  `(user_name, event_day_id)`.
- **Dates on events are text.** `event_days.date` holds `YYYY-MM-DD` (older data
  and some forms use `DD-MM-YYYY`); the frontend parses both
  (`utils/date.ts` → `parseEventDate`). Timestamps elsewhere are `timestamptz`.
- **People are stored by name** in most arrays (`participants`, `passengers`,
  `occupants`, `paid_by`, `uploaded_by`), which is why a profile keeps its former
  names in `aliases`. Newer tables key on `profiles.id` instead (settlements).
- **Array columns** (`text[]`) hold participants, passengers, occupants and
  notification categories; `jsonb` holds ticket types, restaurant cars and
  changelog items.

## Tables

### People and access

| Table | Purpose | Notes |
| --- | --- | --- |
| `profiles` | One row per member | `id` is the Supabase auth user id. `name`, `aliases` (former names), `discord_id`, `discord_username`, `email`, `avatar_url`, banner (`banner_color`, `banner_url`, `banner_position`), `color`, `font`, `bio`, `pronouns`, `phone_number`, `live_location_ping` (JSON text), `badge_ids`, `notification_categories`, `allow_dm`, `show_greeting`, `is_admin`, `is_active`, `is_first_login`, `onboarding_completed`. Created by the backend after a whitelisted login, or by an admin as a stub that is claimed at first login. Never by a database trigger. |
| `whitelist` | Who may log in | `discord_id` and/or `email`; one of them is required. |
| `badges` | Badge definitions | `name`, `description`, `image_url`, `display_order`. Members reference them through `profiles.badge_ids`. |

### Events

| Table | Purpose | Notes |
| --- | --- | --- |
| `events` | A **trip**, one row per convention | `event_name`, `event_group_id` (series label), `location`, `description`, `image_url`, hotel (`is_hotel`, `hotel_location`, `hotel_info`), `is_party`, links and tickets (`website`, `ticket_url`, `ticket_sale_start`, `ticket_types` jsonb), practical info (`parking_info`, `locker_info`, `special_instructions`, `what_to_bring`), and `reminders_sent`, `ticket_reminders_sent` so a reminder is only sent once. |
| `event_days` | A **day** of a trip | `event_id` → `events` (cascade), `date`, `has_con` (false = travel or hotel-only day), `participants`. Unique per `(event_id, date)`. |
| `event_groups` | Series labels ("HDCC") | `name` is what `events.event_group_id` stores. |
| `hotel_rooms` | Rooms of a hotel trip | `event_id` → the parent `events` row, `room_number` (nullable), `floor`, `capacity` (nullable), `instructions`, `occupants`. |

### Things people do on a trip

| Table | Purpose | Notes |
| --- | --- | --- |
| `rides` | Heen, Terug and Restaurant rides | `direction`, `driver`, `vehicle_type`, `departure_time`, `start_location`, `end_location`, `total_seats`, `passengers`, `parking_info`, `car_available`, `action_required`, `restaurant_drivers` (jsonb: cars with their own seats and passengers), `linked_event_id` (a day), `linked_meal_id`. |
| `meals` | Planned meals | `meal_name`, `time`, `location`, `cost`, `transport_needed`, `participants`, `linked_event_id` (a day), `created_by`, and links and notes. |
| `cosplays` | A character worn by a member | `user_name`, `character_name`, `series`, `notes`, `inspo_images` (max 3, enforced by the API), `linked_event_ids` (days). |
| `story_photos` | Photos in a day's story | `event_day_id`, `uploaded_by` (a name), `image_url`, `seq` (global, increasing). |
| `story_seen` | How far each member has watched a day | `(user_name, event_day_id)`, `last_seen_seq`. |

### Money

| Table | Purpose | Notes |
| --- | --- | --- |
| `expenses` | A bill someone paid | `paid_by`, `amount`, `currency`, `description`, `date`, `linked_event_id` (a day). |
| `expense_shares` | What each person owes on an expense | `expense_id`, `participant`, `amount`, `status` (`pending`, `claimed`, `confirmed`), `claimed_at`, `confirmed_at`, `settlement_id`. The payer's own share is created `confirmed`. |
| `settlements` | One payment between two members | `from_user_id` (pays), `to_user_id` (receives), `amount`, `currency`, `status` (`requested`, `claimed`, `confirmed`), `request_url`, `iban`, `account_name` (cleared on confirmation), `created_by`, timestamps. Keyed by profile id. A partial unique index allows one `requested` or `claimed` settlement per pair and currency. |
| `payments` | **Legacy.** The old per-expense payments | Not used by the app any more; the API for it is not mounted. |

### Content

| Table | Purpose | Notes |
| --- | --- | --- |
| `announcements` | Banner messages | `message`, `severity` (`info`, `warning`, `urgent`), `active`, `dismissible`, `notify_discord` |
| `changelog_entries` | Release notes shown in the app | `title`, `items`, `released_at` |

`calendar` was the old one-row-per-day event table. `events` and `event_days`
replaced it; it is dropped by migration v2.19.

## Relationships

```
profiles ───────────────┐ (by name, in arrays)      whitelist   (standalone)
   │ id                 │
   ├──< settlements (from_user_id, to_user_id)
   │
events ──< event_days ──< story_photos          (event_day_id)
   │           ▲  ▲  ▲
   │           │  │  └── expenses.linked_event_id ──< expense_shares >── settlements
   │           │  └───── meals.linked_event_id  ◄── rides.linked_meal_id
   │           └──────── rides.linked_event_id, cosplays.linked_event_ids[]
   └──< hotel_rooms (event_id)
```

## Migrations

Files in `db/migrations/`, run **by hand** in the Supabase SQL editor, in version
order. There is no migrations table, so nothing records what has run: see
[Checking what has been applied](#checking-what-has-been-applied). Each file
starts with a comment explaining what it does and, where it matters, *when* it
must run.

The file names are not perfectly tidy: `migration_v1.1.sql` is titled "v2.2"
inside, `migration_v1.4.sql` is titled "v1.5", and there is no v2.24. Go by file
order, not the number in the title.

| File | What it does |
| --- | --- |
| `migration_v1.1`, `v1.4`, `v1.5` | early fixes: `payments.splits` to jsonb, `profiles.created_at`, extra meal fields and event links, `rides.end_location` |
| `migration_v2.3` | `profiles.banner_position` |
| `migration_v2.4` | `calendar.multi_day_id` (superseded by v2.18) |
| `migration_v2.5` | `hotel_rooms` |
| `migration_v2.6` | `expenses`, `expense_shares` |
| `migration_v2.7` | event cover image |
| `migration_v2.8` | `announcements` |
| `migration_v2.9` | per-user Discord DM categories, ticket reminder tracking |
| `migration_v2.10` | hotel location for the quick-ride shortcuts |
| `migration_v2.11` | link expenses to an event |
| `migration_v2.12` | `changelog_entries` |
| `migration_v2.13` | strip the legacy `#0` from Discord usernames |
| `migration_v2.14` | Google login: whitelist by email |
| `migration_v2.15` | `profiles.show_greeting` |
| `migration_v2.16`, `v2.17` | rooms without a number, room capacity |
| `migration_v2.18`, `v2.18b_grants` | **`events` and `event_days`** (the trip model) and their grants |
| `migration_v2.19_drop_legacy_calendar` | repoint `expenses.linked_event_id` at `event_days`, drop `calendar` |
| `migration_v2.20_story_photos`, `v2.20b_story_grants` | `story_photos`, `story_seen` and their grants |
| `migration_v2.21_meal_created_by` | remember who created a meal |
| `migration_v2.22_lock_down_direct_access` | close direct database and storage access from browsers. Run **after** the release that moved uploads to the backend. |
| `migration_v2.23_login_hardening` | no automatic profiles on signup |
| `migration_v2.25_settlements` | `settlements`, `expense_shares.settlement_id` |
| `migration_v2.26_settlements_one_open_per_pair` | one open settlement per pair, enforced by an index |
| `migration_v2.27_drop_payment_refs` | drop the unused `payment_ref` columns. Run **after** the backend that no longer reads them is live. |
| `migration_cosplays`, `add_whitelist_emails`, `remove_trigger` | one-offs: the cosplays table, a bulk-add template for the whitelist, removal of the old profile trigger |
| `backfill_events_from_calendar.py`, `repoint_fks_to_new_events.py`, `calendar_id_mapping.json` | the one-time data move from `calendar` to `events`/`event_days` (kept for the record) |

**Writing a migration:** make it safe to run twice (`IF NOT EXISTS`,
`IF EXISTS`), grant `service_role` on any new table or sequence, enable RLS,
say in the header when it must run relative to the deploy, and add a line to the
table above and to [TODO.md](../TODO.md) until it has been run.

## Checking what has been applied

Run in the SQL editor:

| Migration | Applied when |
| --- | --- |
| v2.18 | `select to_regclass('public.event_days')` is not null |
| v2.19 | `select to_regclass('public.calendar')` is **null** |
| v2.20 | `select to_regclass('public.story_photos')` is not null |
| v2.25 | `select to_regclass('public.settlements')` is not null |
| v2.26 | `select 1 from pg_indexes where indexname = 'settlements_one_open_per_pair_idx'` returns a row |
| v2.27 | `select 1 from information_schema.columns where table_name = 'settlements' and column_name = 'payment_ref'` returns **no** row |

`db/check_schema.py` compares `db/schema.sql` with the live database, but
`schema.sql` is out of date (see below), so it reports differences that are not
real.

## A fresh database

`db/schema.sql` only describes the early tables (`profiles`, `rides`, `meals`,
`payments`, `calendar`, `badges`, `event_groups`, `announcements`). It does **not**
contain `events`, `event_days`, expenses, settlements, cosplays, stories or
changelog, and the migrations assume the older shape, so "schema plus all
migrations" does not run cleanly on a new project.

Until `schema.sql` is regenerated (it is on the [TODO](../TODO.md)), the reliable
ways to get a new database are:

1. **Copy the live schema:** `pg_dump --schema-only` from the running project's
   database (Supabase → Settings → Database → connection string), and apply it to
   the new project. Then add the whitelist entries.
2. Or write the current shape by hand from the [Tables](#tables) above.

Either way, afterwards: create the storage buckets if you still use them, enable
Discord and Google in Supabase Auth with the redirect URLs of your app, and add the
first admin (a `profiles` row with `is_admin = true` and your `discord_id`, or a
whitelist entry plus a manual update after your first login).

## Storage

- **MinIO** (`cdn.ankerd.org`, bucket `story-photos`): every image uploaded since the
  move to MinIO. Folder layout in [minio-setup.md](minio-setup.md).
- **Supabase Storage** (buckets `event-covers`, `badges`, `banners`): images uploaded
  before then. Still served; nothing new is written there, and browsers can no longer
  write to them (v2.22).
