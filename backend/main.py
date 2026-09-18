from __future__ import annotations

import re
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import get_settings
from app.constants import API_PREFIX, Tables
from app.core.database import supabase
from app.core.logging import configure_logging, get_logger
from app.routers import admin, announcements, badges, calendar, changelog, cosplays, expenses, link_preview, meals, payments, rides, stories, users
from app.services.reminder_scheduler import check_and_send_reminders, check_and_send_ticket_reminders

configure_logging()
logger = get_logger(__name__)

# Single source of truth for the app version — backend/VERSION (kept inside
# backend/ rather than the repo root so it's always included in the Docker
# build context, whether that context is the repo root or backend/ itself).
# Bump it there only; the frontend reads the same file at build time (see
# frontend/vite.config.ts).
APP_VERSION = (Path(__file__).parent / "VERSION").read_text().strip()

_scheduler = AsyncIOScheduler(timezone="Europe/Amsterdam")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Verify Supabase connectivity on startup, then start the reminder scheduler."""
    try:
        supabase.table(Tables.PROFILES).select("name").limit(1).execute()
        logger.info("Supabase connection established")
    except Exception as e:
        logger.warning("Supabase warmup failed — check credentials in .env: %s", e)

    _scheduler.add_job(check_and_send_reminders, "cron", hour=8, minute=0)
    # Ticket-sale timing needs finer granularity than a daily check — sale_start
    # carries an exact time, not just a date.
    _scheduler.add_job(check_and_send_ticket_reminders, "interval", minutes=15)
    _scheduler.start()
    logger.info("Reminder scheduler started (daily 08:00 + ticket checks every 15 min, Europe/Amsterdam)")

    yield

    _scheduler.shutdown(wait=False)
    logger.info("Reminder scheduler stopped")


settings = get_settings()

app = FastAPI(
    title="Ankerd Con API",
    version=APP_VERSION,
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


# Vite names its build output like `index-8998340c.js` — the hash is the file's
# content, so such a URL can never mean anything else. Files we ship by hand
# (public/assets/images/…, public/icons/…) keep their name across builds and
# must NOT be treated that way.
_HASHED_ASSET = re.compile(r"-[0-9a-f]{8,}\.[a-z0-9]+$")


@app.middleware("http")
async def cache_static_assets(request: Request, call_next):
    """Tells browsers what they may keep and for how long.

    Content-hashed build output is immutable and cached for a year: a returning
    visitor reads the bundle from disk instead of the network.

    Everything else gets `no-cache`, which still allows a cached copy but forces
    a revalidation first. That matters most for index.html: it is the one file
    that names the current bundle, and without a Cache-Control header browsers
    fall back to heuristic caching and may hold on to it for hours. After a
    deploy, such a stale index.html asks for chunk filenames the new build no
    longer has, and the app fails to start until its storage is cleared — which
    is exactly what a returning visitor is least equipped to do.
    """
    response = await call_next(request)
    path = request.url.path
    if path.startswith(API_PREFIX):
        return response
    if path.startswith("/assets/") and _HASHED_ASSET.search(path):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    else:
        response.headers.setdefault("Cache-Control", "no-cache")
    return response


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> Response:
    """Pass through HTTPExceptions as clean JSON — no tracebacks.

    One exception: StaticFiles(html=True) only serves index.html for an
    exact directory match, not for arbitrary client-routed paths — so a
    404 for a path with no file extension (i.e. not a missing asset) is
    someone reloading on a page other than the root, and should hand back
    the SPA shell so React Router can handle it, not a raw JSON error.
    """
    path = request.url.path
    if (
        exc.status_code == 404
        and _dist.exists()
        and not path.startswith(API_PREFIX)
        and "." not in path.rsplit("/", 1)[-1]
    ):
        return HTMLResponse((_dist / "index.html").read_text(encoding="utf-8"))
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Return a user-friendly Dutch message for Pydantic validation failures."""
    logger.warning(
        "Validation error on %s %s: %s",
        request.method,
        request.url.path,
        exc.errors(),
    )
    return JSONResponse(
        status_code=422,
        content={"detail": "Ongeldige invoer. Controleer je gegevens en probeer het opnieuw."},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all — ensures no raw tracebacks ever reach the client."""
    logger.error(
        "Unhandled exception on %s %s",
        request.method,
        request.url.path,
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Er is een onverwachte fout opgetreden. Probeer het opnieuw."},
    )


# ── API routers ────────────────────────────────────────────────────
app.include_router(users.router,    prefix=API_PREFIX)
app.include_router(rides.router,    prefix=API_PREFIX)
app.include_router(meals.router,    prefix=API_PREFIX)
app.include_router(payments.router, prefix=API_PREFIX)
app.include_router(calendar.router, prefix=API_PREFIX)
app.include_router(badges.router,    prefix=API_PREFIX)
app.include_router(announcements.router, prefix=API_PREFIX)
app.include_router(changelog.router,    prefix=API_PREFIX)
app.include_router(cosplays.router,  prefix=API_PREFIX)
app.include_router(expenses.router,  prefix=API_PREFIX)
app.include_router(stories.router,   prefix=API_PREFIX)
app.include_router(admin.router,     prefix=API_PREFIX)


@app.get(f"{API_PREFIX}/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok", "service": "ankerd-con-api"}


# ── Serve React frontend (only present after `npm run build`) ──────
_dist = Path(__file__).parent / "dist"
if _dist.exists():
    # Link-embed previews for crawlers (Discord, Slack, ...) — registered
    # before the SPA catch-all so it can intercept /events/{id} first.
    app.include_router(link_preview.router)
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="frontend")
