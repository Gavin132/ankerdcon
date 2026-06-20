from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import auth, calendar, meals, payments, rides, users


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
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tightened per-environment via CORS_ORIGINS env var at deploy time
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# API routes — all prefixed with /api
# ---------------------------------------------------------------------------
_API = "/api"
app.include_router(auth.router, prefix=_API)
app.include_router(users.router, prefix=_API)
app.include_router(rides.router, prefix=_API)
app.include_router(meals.router, prefix=_API)
app.include_router(payments.router, prefix=_API)
app.include_router(calendar.router, prefix=_API)


@app.get("/api/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok", "service": "ankerd-con-api"}


# ---------------------------------------------------------------------------
# Serve React frontend (only present after `npm run build`)
# ---------------------------------------------------------------------------
_dist = Path(__file__).parent / "dist"
if _dist.exists():
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="frontend")
