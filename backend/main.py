from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.core.database import supabase

from app.routers import users, calendar, rides, meals, payments


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Warm up the Sheets connection on startup so the first request isn't slow.
    Failure here is non-fatal — the cache simply stays cold until the first request.
    """
    try:
        from app.core.sheets import get_cached_tables, get_spreadsheet

        settings = get_settings()
        spreadsheet = get_spreadsheet(settings)
        get_cached_tables(spreadsheet)
        print("✅  Google Sheets connection established")
    except Exception as exc:  # noqa: BLE001
        print(f"⚠️   Google Sheets warmup skipped: {exc}")
    yield


app = FastAPI(
    title="Ankerd Con API",
    version="1.2.3",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)


# Force exact matches for local Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# API routes — all prefixed with /api
# ---------------------------------------------------------------------------
_API = "/api"

app.include_router(users.router, prefix=_API)
app.include_router(rides.router, prefix=_API)
app.include_router(meals.router, prefix=_API)
app.include_router(payments.router, prefix=_API)
app.include_router(calendar.router, prefix=_API)


@app.get("/api/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok", "service": "ankerd-con-api"}

@app.get("/api/test-db", tags=["meta"])
def test_db_connection():
    try:
        # Ask Supabase for just the name and color of the first 3 users
        response = supabase.table("profiles").select("name, color").limit(3).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ---------------------------------------------------------------------------
# Serve React frontend (only present after `npm run build`)
# ---------------------------------------------------------------------------
_dist = Path(__file__).parent / "dist"
if _dist.exists():
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="frontend")