<div align="center">

<h1>Ankerd Con</h1>
<p><em>The private event app for the Ankerd group</em></p>

<p>
  <img src="https://img.shields.io/badge/version-2.0-57B2F9?style=for-the-badge" />
  <img src="https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/PWA-installable-f59e0b?style=for-the-badge" />
</p>

<p>
  <img src="https://img.shields.io/badge/React-18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-5-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-3-0ea5e9?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

<p>
  <img src="https://img.shields.io/badge/FastAPI-0.141-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/MinIO-C72E49?style=for-the-badge&logo=minio&logoColor=white" />
</p>

</div>

Ankerd Con keeps a group organised around conventions: who is going, who is
driving, where everyone eats, who sleeps in which hotel room, who owes whom,
and the photos afterwards. It is an installable web app (a PWA) built for phones
in convention halls, so it is designed to keep working on poor reception.

The interface is in Dutch. Access is invite-only: you log in with Discord or
Google, and only accounts on the whitelist get in.

## What it does

| Area | What you get |
| --- | --- |
| **Hub** | The nearest trip as a ticket with a countdown, quick "offer / join a ride" shortcuts, today's meals, "Voor jou" (everything you still need to arrange), story rings and a location ping. |
| **Trip** (Event) | One page per trip with a tile per part of it: **Vervoer**, **Eten**, **Kamers**, **Cosplay**, **Foto's**, **Weer**, **Praktisch** and **Uitgaven**. Each tile shows the answer and opens a sheet to change things. Tap a day on the ticket to sign up. |
| **Transport** | Offer seats, join a ride, restaurant runs with several cars, public transport, and a timeline. Drivers can take a ride back. |
| **Food** | Meal plans with cost, dietary info and transport needs, and RSVPs. |
| **Rooms** | Hotel rooms per trip, self-assignment, bulk creation and capacity. |
| **Cosplay** | Who wears what on which day, with up to three reference images each. |
| **Photos** | Instagram-style stories per event day, "unseen" tracking, and every member's photos on their profile. |
| **Finance** | Shared expenses split between members, and **Afrekenen**: settle everything two members owe each other with one payment (payment-request link or IBAN, confirmed by the receiver). |
| **Agenda** | Upcoming trips as tickets, past trips as a recap with photos, and a subscribable `.ics` feed. |
| **Crew** | Member directory, profiles with badges, and "where is everyone" location pings on a map. |
| **Search** | One search across trips, rides, meals, cosplays and crew. |
| **Notifications** | Opt-in Discord DMs (new events, ticket sales, reminders, rides, meals, expenses, payment requests) plus a shared webhook channel. |
| **Admin panel** | Users, whitelist, rides, meals, events and groups, badges, payments, announcements, changelog, "log in as", a screens preview, and a view of every file in the photo bucket (CDN). |

A tour of each area, including how the pieces fit together, is in
[docs/features.md](docs/features.md).

## Tech stack

```
Frontend      React 18 · TypeScript · Vite · Tailwind CSS · Framer Motion
              TanStack Query (persisted) · Zustand · react-hook-form + Zod
              Leaflet (maps) · Recharts (admin charts) · a hand-written service worker
Backend       Python 3.12 · FastAPI · Uvicorn · APScheduler
Database      Supabase (PostgreSQL); the backend is the only thing that talks to it
Auth          Supabase Auth with Discord and Google, checked against a whitelist
Files         MinIO (S3-compatible, self-hosted) behind cdn.ankerd.org
Integrations  Discord webhook + bot DMs · Open-Meteo weather · OpenStreetMap
```

## Get it running

You need Node.js 18+, **Python 3.12** and a Supabase project.

```bash
git clone https://github.com/Gavin132/ankerdcon.git && cd ankerdcon
cp backend/.env.example backend/.env       # then fill in the values
cp frontend/.env.example frontend/.env
```

```powershell
.\dev.ps1 -Install        # Windows: create .venv, install everything, start both
```

```bash
./dev.sh --install        # macOS / Linux
```

Afterwards `.\dev.ps1` or `./dev.sh` starts the backend on
`http://localhost:8000` and the frontend on `http://localhost:5173`.
The full guide, with env variables and troubleshooting, is
**[docs/local-development.md](docs/local-development.md)**.

## Repository layout

```
ankerdcon/
├── frontend/            The React app
│   ├── src/pages/       Screens (Hub, trip, finance, profile, admin/…)
│   ├── src/components/  UI grouped by area (trip, finance, hub, story, …)
│   ├── src/hooks/       TanStack Query hooks, one file per domain
│   ├── src/services/    API calls, one file per domain
│   ├── src/store/       Zustand stores (auth, theme, toasts, time, upload queue)
│   ├── src/utils/       Pure helpers (dates, trips, rides, images, …)
│   └── sw/              The service worker source
├── backend/
│   ├── main.py          App wiring: middleware, routers, scheduler, static files
│   ├── app/routers/     One router per area
│   ├── app/services/    Discord, notifications, reminders, weather, settle-up maths
│   ├── app/core/        Supabase and MinIO clients, security, uploads
│   ├── app/dependencies.py   Auth: token → profile → whitelist, act_as, admin check
│   ├── tests/           pytest
│   └── VERSION          The app version (the frontend reads it too)
├── db/                  schema.sql, migrations/, check_schema.py
├── docs/                Documentation (start at docs/README.md)
├── dev.ps1 · dev.sh     Run backend and frontend together
├── CHANGELOG.md         What changed per release
└── TODO.md              What is still to do
```

In production the backend also serves the built frontend (`backend/dist`), so
the whole app is one container.

## Documentation

Everything lives in [`docs/`](docs/README.md):

| | |
| --- | --- |
| [Architecture](docs/architecture.md) | How the pieces fit: request flow, data model, offline behaviour |
| [Features](docs/features.md) | What each part of the app does, and where its code is |
| [Local development](docs/local-development.md) | Set up, run, test, troubleshoot |
| [Deployment](docs/deployment.md) | Environments, building, env vars, migrations |
| [Database](docs/database.md) | Tables, relationships, migration history |
| [API](docs/api.md) | Every endpoint, who may call it, and the conventions |
| [Security](docs/security.md) | Login, permissions, impersonation, headers, uploads |
| [Frontend](docs/frontend.md) | Structure, data layer, conventions |
| [Design system](docs/design-system.md) | Tokens, type, components |
| [Operations](docs/operations.md) | Monitoring, logs, and what to do when it misbehaves |
| [MinIO setup](docs/minio-setup.md) | The photo storage stack |
| [Acting for others](docs/acting-for-others.md) | Who may sign someone else up |

## Contributing

Work happens on `development`; `main` is the released state. Before you push:

```bash
cd backend && python -m pytest                 # backend tests
cd frontend && npx tsc --noEmit && npm run build   # types and production build
```

Backend and frontend changes go live only after the image is rebuilt, and new
files in `db/migrations/` have to be run by hand. See
[docs/deployment.md](docs/deployment.md).

## License

MIT. See [LICENSE](LICENSE).
