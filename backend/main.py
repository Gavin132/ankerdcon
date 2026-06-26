from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.constants import API_PREFIX, Tables
from app.core.database import supabase
from app.routers import admin, badges, calendar, meals, payments, rides, users


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Verify Supabase connectivity on startup."""
    try:
        supabase.table(Tables.PROFILES).select("name").limit(1).execute()
        print("✅  Supabase connection established")
    except Exception:
        print("⚠️   Supabase warmup failed — check credentials in .env")
    yield


settings = get_settings()

app = FastAPI(
    title="Ankerd Con API",
    version="1.4.0",
    docs_url=f"{API_PREFIX}/docs",
    redoc_url=f"{API_PREFIX}/redoc",
    openapi_url=f"{API_PREFIX}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routers ────────────────────────────────────────────────────
app.include_router(users.router,    prefix=API_PREFIX)
app.include_router(rides.router,    prefix=API_PREFIX)
app.include_router(meals.router,    prefix=API_PREFIX)
app.include_router(payments.router, prefix=API_PREFIX)
app.include_router(calendar.router, prefix=API_PREFIX)
app.include_router(badges.router,   prefix=API_PREFIX)
app.include_router(admin.router,    prefix=API_PREFIX)


@app.get(f"{API_PREFIX}/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok", "service": "ankerd-con-api"}


# ── Serve React frontend (only present after `npm run build`) ──────
_dist = Path(__file__).parent / "dist"
if _dist.exists():
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="frontend")
