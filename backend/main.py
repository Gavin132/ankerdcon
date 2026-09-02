from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import get_settings
from app.constants import API_PREFIX, Tables
from app.core.database import supabase
from app.core.logging import configure_logging, get_logger
from app.routers import admin, announcements, badges, calendar, changelog, cosplays, expenses, link_preview, meals, payments, rides, users
from app.services.reminder_scheduler import check_and_send_reminders, check_and_send_ticket_reminders

configure_logging()
logger = get_logger(__name__)

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
    version="1.5.2",
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


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Pass through HTTPExceptions as clean JSON — no tracebacks."""
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
