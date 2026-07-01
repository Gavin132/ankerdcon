<div align="center">

<h1>⚓ Ankerd Con ⚓</h1>
<p><em>Private event app for Ankerd</em></p>

<p>
  <img src="https://img.shields.io/badge/version-1.4.0-6366f1?style=for-the-badge" />
  <img src="https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/PWA-ready-f59e0b?style=for-the-badge&logo=pwa&logoColor=white" />
</p>

<p>
  <img src="https://img.shields.io/badge/React-18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-5-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-4-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-3-0ea5e9?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

<p>
  <img src="https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Discord_OAuth-5865F2?style=for-the-badge&logo=discord&logoColor=white" />
</p>

<br />

> A full-stack PWA that keeps the group organized at every con —
> rides, meals, finances, hotel rooms, and events in one place.

</div>

<br />

---

## 🗂️ Features

|     | Module          | Description                                                                  |
| --- | --------------- | ---------------------------------------------------------------------------- |
| 🏠  | **Hub**         | Active event overview, crew roster, hotel room grouping                      |
| 🚗  | **Transport**   | Ride coordination — offer seats, join rides, restaurant runs, public transit |
| 🍜  | **Food**        | Meal planning with cost tracking, dietary info, and transport links          |
| 💸  | **Finance**     | Shared expense splitting with balance overview and payment history           |
| 📅  | **Calendar**    | Event schedule with RSVP, weather forecast, tickets, and practical info      |
| 🏨  | **Hotel Rooms** | Room assignments per event with occupant list                                |
| 👥  | **Members**     | Crew directory with profiles, badges, and Discord avatars                    |
| 🛠️  | **Admin Panel** | Full CRUD for users, rides, meals, events, badges, and event groups          |

---

## 🧱 Tech Stack

```
Frontend       React 18 · TypeScript · Vite · Tailwind CSS · Framer Motion
Backend        Python 3.11 · FastAPI · Uvicorn
Database       Supabase (PostgreSQL)
Auth           Discord OAuth via Supabase Auth
Server State   TanStack Query v5
Client State   Zustand
Forms          react-hook-form + Zod
Charts         Recharts
Icons          Lucide React
```

---

## 📁 Project Structure

```
ankerdcon/
├── 🎨 frontend/src/
│   ├── pages/            Route-level components (Hub, Transport, Food, …)
│   │   └── admin/        Admin panel pages
│   ├── components/       Shared UI — Modal, Drawer, Badge, Button, …
│   ├── hooks/            TanStack Query hooks per domain
│   ├── lib/api/          Axios client + ApiError class
│   ├── config/           env.ts · api-routes.ts · routes.ts
│   ├── store/            Zustand stores (auth, theme)
│   ├── types/            Global TypeScript types
│   └── utils/            Date formatting, helpers
│
├── ⚙️  backend/app/
│   ├── routers/          FastAPI routers (rides, meals, payments, …)
│   ├── core/             Supabase client, config
│   ├── services/         Discord bot, business logic
│   └── dependencies.py   Auth middleware — JWT → profile → whitelist
│
└── 🗄️  db/
    ├── schema.sql         Full schema for fresh projects
    └── migrations/        Incremental migrations (v1.1 → v2.6)
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ · Python 3.11+ · A [Supabase](https://supabase.com) project with Discord OAuth enabled

### 1 · Install

```bash
git clone https://github.com/your-org/ankerdcon.git && cd ankerdcon

# Frontend
cd frontend && npm install

# Backend
cd ../backend && python -m venv ../.venv
source ../.venv/Scripts/activate      # Windows
# source ../.venv/bin/activate        # macOS / Linux
pip install -r requirements.txt
```

### 2 · Database

Run `db/schema.sql` in the Supabase SQL editor for a fresh project. For an existing database, apply `db/migrations/` in version order.

### 3 · Run

```bash
# Frontend  →  http://localhost:5173
cd frontend && npm run dev

# Backend   →  http://localhost:8000  (docs at /docs)
cd backend && uvicorn app.main:app --reload
```

---

## 🔐 Authentication

```
Discord login  →  Supabase OAuth  →  JWT issued
                                          ↓
                               Backend validates JWT
                                          ↓
                          Check whitelist table by discord_id
                                          ↓
                    ✅ Whitelisted → auto-create profile + welcome DM
                    ❌ Not found  → 403 Forbidden
```

Access is **invite-only**. Grant entry by adding a Discord ID to the whitelist:

```sql
INSERT INTO whitelist (discord_id) VALUES ('123456789012345678');
```

---

## 📱 PWA

| Feature           | Detail                                                      |
| ----------------- | ----------------------------------------------------------- |
| Safe area support | Notch, home indicator, Android nav bar                      |
| Modals            | Bottom sheet on mobile · standard dialog on desktop         |
| Dark mode         | User-controlled toggle, persisted to `localStorage`         |
| Keyboard          | `viewport-fit=cover` + `interactive-widget=resizes-content` |
