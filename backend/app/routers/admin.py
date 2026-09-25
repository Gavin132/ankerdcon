from datetime import datetime, timezone

import re
import uuid

from fastapi.concurrency import run_in_threadpool
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile, status
import jwt

from app.config import Settings, get_settings
from app.constants import Tables
from app.core import minio_client
from app.core.logging import get_logger
from app.core.uploads import clean_image, read_capped, sniff_video
from app.dependencies import _unique_profile_name, get_admin_user
from app.models.admin import (
    CdnListing,
    CdnObject,
    AdminCreateEventRequest,
    AdminCreateMealRequest,
    AdminCreateUserRequest,
    AdminSetShareStatusRequest,
    AdminUpdateEventRequest,
    AdminUpdateExpenseRequest,
    AdminUpdateHotelRoomRequest,
    AdminUpdateMealRequest,
    AdminUpdateRideRequest,
    AdminUpdateUserRequest,
    BulkDeleteEventsRequest,
    BulkDeleteUsersRequest,
    BulkDeactivateUsersRequest,
    BulkDeleteRidesRequest,
    BulkDeleteMealsRequest,
    BulkDeleteEventGroupsRequest,
    BulkRsvpRequest,
    BulkSetEventGroupRequest,
    CreateEventDayRequest,
    UpdateEventDayRequest,
    EventGroup,
    CreateEventGroupRequest,
    UpdateEventGroupRequest,
)
from app.models.announcement import Announcement, CreateAnnouncementRequest, UpdateAnnouncementRequest
from app.models.whitelist import WhitelistEntry, CreateWhitelistEntryRequest
from app.models.changelog import ChangelogEntry, CreateChangelogEntryRequest, UpdateChangelogEntryRequest
from app.models.badge import Badge, BadgeOrderItem, CreateBadgeRequest, UpdateBadgeRequest
from app.models.calendar import Event, EventDay, HotelRoom
from app.routers.calendar import _hotel_group_key
from app.routers.expenses import expense_in_open_settlement, share_in_open_settlement
from app.models.meal import Meal
from app.models.rides import CreateRideRequest, Ride
from app.models.user import User
from app.routes import AdminRoutes
import app.services.discord_service as discord_service
from app.services import discord_bot, notification_service
from app import messages as M
from app.core.database import supabase

logger = get_logger(__name__)
router = APIRouter(prefix=AdminRoutes.PREFIX, tags=["admin"])

_DB_ERROR = "Databasefout. Probeer het opnieuw."

# Upload kind -> folder in the MinIO bucket
_IMAGE_FOLDERS = {"event-cover": "event-covers", "badge": "badges"}
_IMAGE_MAX_BYTES = 10 * 1024 * 1024  # 10 MB
_VIDEO_MAX_BYTES = 80 * 1024 * 1024  # 80 MB (the request limit for this route is 90)


def _build_updates(body, nullable_fields: set[str] | None = None) -> dict:
    """Build a partial-update dict.

    Fields set to ``None`` are normally excluded so they don't accidentally
    overwrite existing data.  Pass field names in *nullable_fields* to allow
    those fields to be explicitly cleared (set to NULL) when the caller
    includes them in the request body.
    """
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    for field in (nullable_fields or set()):
        if field in body.model_fields_set:
            updates[field] = getattr(body, field)
    return updates


# ── Stats ──────────────────────────────────────────────────────────────────────

@router.get(AdminRoutes.STATS)
def get_stats(_: str = Depends(get_admin_user)) -> dict:
    try:
        users  = supabase.table(Tables.PROFILES).select("id").execute()
        rides  = supabase.table(Tables.RIDES).select("id").execute()
        meals  = supabase.table(Tables.MEALS).select("id").execute()
        events = supabase.table(Tables.EVENTS).select("id").execute()
    except Exception as e:
        logger.error("Failed to fetch admin stats: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    return {
        "users":  len(users.data),
        "rides":  len(rides.data),
        "meals":  len(meals.data),
        "events": len(events.data),
    }


# ── Users ──────────────────────────────────────────────────────────────────────

@router.get(AdminRoutes.USERS, response_model=list[User])
def admin_list_users(_: str = Depends(get_admin_user)) -> list[User]:
    try:
        resp = supabase.table(Tables.PROFILES).select("*").order("name").execute()
    except Exception as e:
        logger.error("Failed to list users: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    users = []
    for user in resp.data:
        user.pop("passcode", None)
        users.append(user)
    return users


@router.post(AdminRoutes.USERS, response_model=User, status_code=status.HTTP_201_CREATED)
def admin_create_user(body: AdminCreateUserRequest, _: str = Depends(get_admin_user)) -> User:
    """Create a stub profile to allowlist a new user before they log in with Discord."""
    if _unique_profile_name(body.name) != body.name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Deze naam is al in gebruik (of was de naam van iemand anders).",
        )
    data: dict = {"name": body.name, "is_admin": body.is_admin, "is_active": True, "is_first_login": True}
    if body.discord_id:
        data["discord_id"] = body.discord_id
    try:
        resp = supabase.table(Tables.PROFILES).insert(data).execute()
    except Exception as e:
        logger.error("Failed to create user %s: %s", body.name, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kon gebruiker niet aanmaken.")
    return resp.data[0]


@router.post(AdminRoutes.IMPERSONATE)
def admin_impersonate_user(
    user_id: str,
    admin: str = Depends(get_admin_user),
    settings: Settings = Depends(get_settings),
) -> dict:
    """Mints a short-lived session token for another profile, so an admin can
    browse and act in the app as that user. Mainly for guest ("dummy")
    profiles that have no Discord account and can't log in themselves, but
    works for any profile."""
    if not settings.supabase_jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Inloggen als gebruiker is niet geconfigureerd op deze server.",
        )
    try:
        resp = (
            supabase.table(Tables.PROFILES)
            .select("id, name, discord_id, discord_username, avatar_url, email, is_active, is_admin")
            .eq("id", user_id)
            .execute()
        )
    except Exception as e:
        logger.error("Failed to fetch profile %s for impersonation: %s", user_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")

    profile = resp.data[0]
    if profile.get("is_active") is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Deze gebruiker is gedeactiveerd.")
    # Acting as another admin would let one admin use (and hide behind)
    # another's account, so impersonation stops at regular members.
    if profile.get("is_admin") and profile["name"] != admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Je kunt niet inloggen als een andere admin.")
    logger.warning("Impersonation: admin %s signed in as %s (%s)", admin, profile["name"], profile["id"])

    # get_current_user resolves this token by `sub` alone (profiles.id), so it
    # works for guest profiles without any linked login too. The metadata only
    # mirrors a real token's shape; nothing on the backend reads it.
    is_discord = bool(profile.get("discord_id")) or not profile.get("email")
    now = int(datetime.now(timezone.utc).timestamp())
    payload: dict = {
        "sub": profile["id"],
        "aud": "authenticated",
        "role": "authenticated",
        "iat": now,
        "exp": now + 2 * 60 * 60,  # 2 hours
        "app_metadata": {
            "provider": "discord" if is_discord else "google",
            "providers": ["discord" if is_discord else "google"],
        },
        "user_metadata": {
            "full_name": profile["name"],
            "name": profile["name"],
            "preferred_username": profile.get("discord_username") or profile["name"],
            "provider_id": profile.get("discord_id"),
            "avatar_url": profile.get("avatar_url"),
        },
    }
    if profile.get("email"):
        payload["email"] = profile["email"]
    token = jwt.encode(payload, settings.supabase_jwt_secret, algorithm="HS256")
    return {"access_token": token, "name": profile["name"]}


def _remove_user_from_all_events(name: str) -> None:
    """Strip a user's name from passengers/participants arrays across all tables."""
    for table, field in [
        (Tables.RIDES, "passengers"),
        (Tables.MEALS, "participants"),
        (Tables.EVENT_DAYS, "participants"),
    ]:
        try:
            rows = supabase.table(table).select(f"id, {field}").execute().data or []
            for row in rows:
                members: list = row.get(field) or []
                if name in members:
                    supabase.table(table).update({field: [m for m in members if m != name]}).eq("id", row["id"]).execute()
        except Exception as e:
            logger.error("Cleanup %s.%s failed for %r: %s", table, field, name, e)


def _revoke_whitelist(row: dict) -> None:
    """Deleting someone must also take away their way back in: without this,
    their next login passes the whitelist and gets a brand-new profile."""
    for column in ("discord_id", "email"):
        value = row.get(column)
        if not value:
            continue
        try:
            supabase.table(Tables.WHITELIST).delete().eq(column, value.lower() if column == "email" else value).execute()
        except Exception as e:
            logger.error("Failed to remove %s from the whitelist for %s: %s", column, row.get("name"), e)


@router.put(AdminRoutes.USER_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_update_user(
    user_id: str,
    body: AdminUpdateUserRequest,
    _: str = Depends(get_admin_user),
    settings: Settings = Depends(get_settings),
) -> None:
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return

    try:
        current = supabase.table(Tables.PROFILES).select("name, discord_id, is_active, allow_dm").eq("id", user_id).execute()
    except Exception as e:
        logger.error("Failed to fetch user %s for update: %s", user_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not current.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")
    row = current.data[0]

    try:
        resp = supabase.table(Tables.PROFILES).update(updates).eq("id", user_id).execute()
    except Exception as e:
        logger.error("Failed to update user %s: %s", user_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")

    # Deactivation: send DM + remove from all events
    if body.is_active is False and row.get("is_active") is not False:
        if row.get("name"):
            _remove_user_from_all_events(row["name"])
        if row.get("allow_dm", True) and row.get("discord_id"):
            try:
                discord_bot.send_deactivated_dm(settings.discord_bot_token, row["discord_id"])
            except Exception as e:
                logger.warning("Failed to send deactivation DM to %s: %s", row.get("discord_id"), e)


@router.delete(AdminRoutes.USER_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_user(
    user_id: str,
    _: str = Depends(get_admin_user),
    settings: Settings = Depends(get_settings),
) -> None:
    try:
        current = supabase.table(Tables.PROFILES).select("name, discord_id, email, allow_dm").eq("id", user_id).execute()
    except Exception as e:
        logger.error("Failed to fetch user %s for deletion: %s", user_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not current.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")
    row = current.data[0]

    if row.get("name"):
        _remove_user_from_all_events(row["name"])

    try:
        supabase.table(Tables.PROFILES).delete().eq("id", user_id).execute()
    except Exception as e:
        logger.error("Failed to delete user %s: %s", user_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    _revoke_whitelist(row)

    if row.get("allow_dm", True) and row.get("discord_id"):
        try:
            discord_bot.send_removed_dm(settings.discord_bot_token, row["discord_id"])
        except Exception as e:
            logger.warning("Failed to send removal DM to %s: %s", row.get("discord_id"), e)


@router.post(AdminRoutes.USERS_BULK_DELETE, status_code=status.HTTP_204_NO_CONTENT)
def admin_bulk_delete_users(
    body: BulkDeleteUsersRequest,
    _: str = Depends(get_admin_user),
    settings: Settings = Depends(get_settings),
) -> None:
    for user_id in body.user_ids:
        try:
            current = supabase.table(Tables.PROFILES).select("name, discord_id, email, allow_dm").eq("id", user_id).execute()
        except Exception as e:
            logger.error("Failed to fetch user %s during bulk delete: %s", user_id, e)
            continue
        if not current.data:
            continue
        row = current.data[0]
        if row.get("name"):
            _remove_user_from_all_events(row["name"])
        try:
            supabase.table(Tables.PROFILES).delete().eq("id", user_id).execute()
        except Exception as e:
            logger.error("Failed to delete user %s during bulk delete: %s", user_id, e)
            continue
        _revoke_whitelist(row)
        if row.get("allow_dm", True) and row.get("discord_id"):
            try:
                discord_bot.send_removed_dm(settings.discord_bot_token, row["discord_id"])
            except Exception as e:
                logger.warning("Failed to send removal DM to %s: %s", row.get("discord_id"), e)


@router.post(AdminRoutes.USERS_BULK_DEACTIVATE, status_code=status.HTTP_204_NO_CONTENT)
def admin_bulk_deactivate_users(body: BulkDeactivateUsersRequest, _: str = Depends(get_admin_user)) -> None:
    for user_id in body.user_ids:
        try:
            supabase.table(Tables.PROFILES).update({"is_active": False}).eq("id", user_id).execute()
        except Exception as e:
            logger.error("Failed to deactivate user %s: %s", user_id, e)


# ── Whitelist ──────────────────────────────────────────────────────────────────
# Who's allowed to create a profile on first login — by discord_id (Discord
# login) or by email (Google login). Checked in get_current_user before a new
# profile is auto-created; doesn't affect anyone who already has one.

@router.get(AdminRoutes.WHITELIST, response_model=list[WhitelistEntry])
def admin_list_whitelist(_: str = Depends(get_admin_user)) -> list[WhitelistEntry]:
    try:
        return (
            supabase.table(Tables.WHITELIST)
            .select("*")
            .order("created_at", desc=True)
            .execute()
            .data
        )
    except Exception as e:
        logger.error("Failed to list whitelist: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.WHITELIST, response_model=WhitelistEntry, status_code=status.HTTP_201_CREATED)
def admin_create_whitelist_entry(body: CreateWhitelistEntryRequest, _: str = Depends(get_admin_user)) -> WhitelistEntry:
    try:
        resp = (
            supabase.table(Tables.WHITELIST)
            .insert({"discord_id": body.discord_id, "email": body.email})
            .execute()
        )
        return resp.data[0]
    except Exception as e:
        msg = str(e)
        if "duplicate key" in msg or "already exists" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Deze persoon staat al op de lijst.")
        logger.error("Failed to create whitelist entry: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.delete(AdminRoutes.WHITELIST_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_whitelist_entry(entry_id: str, _: str = Depends(get_admin_user)) -> None:
    try:
        supabase.table(Tables.WHITELIST).delete().eq("id", entry_id).execute()
    except Exception as e:
        logger.error("Failed to delete whitelist entry %s: %s", entry_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


# ── Rides ──────────────────────────────────────────────────────────────────────

@router.get(AdminRoutes.RIDES, response_model=list[Ride])
def admin_list_rides(_: str = Depends(get_admin_user)) -> list[Ride]:
    try:
        return supabase.table(Tables.RIDES).select("*").order("departure_time").execute().data
    except Exception as e:
        logger.error("Failed to list rides: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.RIDES, response_model=Ride, status_code=status.HTTP_201_CREATED)
def admin_create_ride(
    body: CreateRideRequest,
    background_tasks: BackgroundTasks,
    _: str = Depends(get_admin_user),
    settings: Settings = Depends(get_settings),
) -> Ride:
    new_ride = body.model_dump()
    new_ride["passengers"] = [body.driver] if body.vehicle_type == "Car" else []
    new_ride["restaurant_drivers"] = []
    try:
        resp = supabase.table(Tables.RIDES).insert(new_ride).execute()
    except Exception as e:
        logger.error("Failed to create ride: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    background_tasks.add_task(
        notification_service.broadcast_category_dm,
        settings.discord_bot_token,
        notification_service.NotificationCategory.RIDE_CREATED,
        M.DM_RIDE_CREATED.format(
            driver=body.driver,
            departure_time=body.departure_time,
            start_location=body.start_location,
        ),
    )
    return resp.data[0]


@router.put(AdminRoutes.RIDE_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_update_ride(
    ride_id: str,
    body: AdminUpdateRideRequest,
    _: str = Depends(get_admin_user),
) -> None:
    updates = _build_updates(body, nullable_fields={"linked_event_id"})
    if not updates:
        return
    try:
        resp = supabase.table(Tables.RIDES).update(updates).eq("id", ride_id).execute()
    except Exception as e:
        logger.error("Failed to update ride %s: %s", ride_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rit niet gevonden.")


@router.delete(AdminRoutes.RIDE_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_ride(ride_id: str, _: str = Depends(get_admin_user)) -> None:
    try:
        supabase.table(Tables.RIDES).delete().eq("id", ride_id).execute()
    except Exception as e:
        logger.error("Failed to delete ride %s: %s", ride_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.RIDES_BULK_DELETE, status_code=status.HTTP_204_NO_CONTENT)
def admin_bulk_delete_rides(body: BulkDeleteRidesRequest, _: str = Depends(get_admin_user)) -> None:
    for ride_id in body.ride_ids:
        try:
            supabase.table(Tables.RIDES).delete().eq("id", ride_id).execute()
        except Exception as e:
            logger.error("Failed to delete ride %s during bulk delete: %s", ride_id, e)


@router.delete(AdminRoutes.RIDE_PASSENGER, status_code=status.HTTP_204_NO_CONTENT)
def admin_remove_passenger(ride_id: str, passenger: str, _: str = Depends(get_admin_user)) -> None:
    try:
        resp = supabase.table(Tables.RIDES).select("passengers").eq("id", ride_id).execute()
    except Exception as e:
        logger.error("Failed to fetch ride %s for passenger removal: %s", ride_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rit niet gevonden.")
    passengers = [p for p in (resp.data[0].get("passengers") or []) if p != passenger]
    try:
        supabase.table(Tables.RIDES).update({"passengers": passengers}).eq("id", ride_id).execute()
    except Exception as e:
        logger.error("Failed to update passengers for ride %s: %s", ride_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


# ── Meals ──────────────────────────────────────────────────────────────────────

@router.get(AdminRoutes.MEALS, response_model=list[Meal])
def admin_list_meals(_: str = Depends(get_admin_user)) -> list[Meal]:
    try:
        return supabase.table(Tables.MEALS).select("*").execute().data
    except Exception as e:
        logger.error("Failed to list meals: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.MEALS, response_model=Meal, status_code=status.HTTP_201_CREATED)
def admin_create_meal(body: AdminCreateMealRequest, _: str = Depends(get_admin_user)) -> Meal:
    meal_data = body.model_dump()
    meal_data["participants"] = []
    try:
        resp = supabase.table(Tables.MEALS).insert(meal_data).execute()
        return resp.data[0]
    except Exception as e:
        logger.error("Failed to create meal: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.put(AdminRoutes.MEAL_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_update_meal(
    meal_id: str,
    body: AdminUpdateMealRequest,
    _: str = Depends(get_admin_user),
) -> None:
    updates = _build_updates(body, nullable_fields={
        "linked_event_id", "website", "menu_url", "description",
        "dietary_options", "parking_info", "extra_notes",
    })
    if not updates:
        return
    try:
        resp = supabase.table(Tables.MEALS).update(updates).eq("id", meal_id).execute()
    except Exception as e:
        logger.error("Failed to update meal %s: %s", meal_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maaltijd niet gevonden.")


@router.delete(AdminRoutes.MEAL_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_meal(meal_id: str, _: str = Depends(get_admin_user)) -> None:
    try:
        supabase.table(Tables.MEALS).delete().eq("id", meal_id).execute()
    except Exception as e:
        logger.error("Failed to delete meal %s: %s", meal_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.MEALS_BULK_DELETE, status_code=status.HTTP_204_NO_CONTENT)
def admin_bulk_delete_meals(body: BulkDeleteMealsRequest, _: str = Depends(get_admin_user)) -> None:
    for meal_id in body.meal_ids:
        try:
            supabase.table(Tables.MEALS).delete().eq("id", meal_id).execute()
        except Exception as e:
            logger.error("Failed to delete meal %s during bulk delete: %s", meal_id, e)


@router.delete(AdminRoutes.MEAL_PARTICIPANT, status_code=status.HTTP_204_NO_CONTENT)
def admin_remove_meal_participant(
    meal_id: str, participant: str, _: str = Depends(get_admin_user)
) -> None:
    try:
        resp = supabase.table(Tables.MEALS).select("participants").eq("id", meal_id).execute()
    except Exception as e:
        logger.error("Failed to fetch meal %s for participant removal: %s", meal_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maaltijd niet gevonden.")
    participants = [p for p in (resp.data[0].get("participants") or []) if p != participant]
    try:
        supabase.table(Tables.MEALS).update({"participants": participants}).eq("id", meal_id).execute()
    except Exception as e:
        logger.error("Failed to update participants for meal %s: %s", meal_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


# ── Expenses ───────────────────────────────────────────────────────────────────

@router.put(AdminRoutes.EXPENSE_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_update_expense(
    expense_id: str,
    body: AdminUpdateExpenseRequest,
    _: str = Depends(get_admin_user),
) -> None:
    updates = _build_updates(body, nullable_fields={"linked_event_id"})
    if not updates:
        return
    try:
        resp = supabase.table(Tables.EXPENSES).update(updates).eq("id", expense_id).execute()
    except Exception as e:
        logger.error("Failed to update expense %s: %s", expense_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Uitgave niet gevonden.")


@router.delete(AdminRoutes.EXPENSE_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_expense(expense_id: str, _: str = Depends(get_admin_user)) -> None:
    """Admin override of the user-facing delete — bypasses the "only the payer
    can delete" restriction so admins can clean up any transaction."""
    if expense_in_open_settlement(expense_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Deze uitgave zit in een lopende afrekening. Rond die eerst af of trek hem in.",
        )
    try:
        supabase.table(Tables.EXPENSES).delete().eq("id", expense_id).execute()
    except Exception as e:
        logger.error("Failed to delete expense %s: %s", expense_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.put(AdminRoutes.EXPENSE_SHARE_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_set_share_status(
    share_id: str,
    body: AdminSetShareStatusRequest,
    _: str = Depends(get_admin_user),
) -> None:
    """Lets an admin directly set a share's status (including reverting it),
    unlike the user-facing claim/confirm endpoints which only move forward
    one step at a time."""
    if share_in_open_settlement(share_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Dit aandeel zit in een lopende afrekening. Bevestig of trek die in onder Afrekenen.",
        )
    now = datetime.now(timezone.utc).isoformat()
    updates: dict = {"status": body.status}
    if body.status == "pending":
        updates["claimed_at"] = None
        updates["confirmed_at"] = None
    elif body.status == "claimed":
        updates["claimed_at"] = now
        updates["confirmed_at"] = None
    elif body.status == "confirmed":
        updates["confirmed_at"] = now
        try:
            existing = (
                supabase.table(Tables.EXPENSE_SHARES).select("claimed_at").eq("id", share_id).single().execute()
            )
            if existing.data and not existing.data.get("claimed_at"):
                updates["claimed_at"] = now
        except Exception:
            pass  # non-fatal — worst case claimed_at stays as it was

    try:
        resp = supabase.table(Tables.EXPENSE_SHARES).update(updates).eq("id", share_id).execute()
    except Exception as e:
        logger.error("Failed to set status for expense share %s: %s", share_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aandeel niet gevonden.")


# ── Events ─────────────────────────────────────────────────────────────────────
# One `events` row per trip/convention (e.g. "DoKomi 2027") owning every
# shared field; one `event_days` row per day of that trip owning only the
# date, whether there's a con happening that day, and RSVP.

@router.get(AdminRoutes.EVENTS, response_model=list[Event])
def admin_list_events(_: str = Depends(get_admin_user)) -> list[Event]:
    try:
        return supabase.table(Tables.EVENTS).select("*").order("event_name").execute().data
    except Exception as e:
        logger.error("Failed to list events: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.get(AdminRoutes.EVENT_DAYS_ALL, response_model=list[EventDay])
def admin_list_event_days(_: str = Depends(get_admin_user)) -> list[EventDay]:
    """Every day across every event — the admin page joins this with
    admin_list_events client-side to render each event's days."""
    try:
        return supabase.table(Tables.EVENT_DAYS).select("*").order("date").execute().data
    except Exception as e:
        logger.error("Failed to list event days: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.EVENTS_BULK_DELETE, status_code=status.HTTP_204_NO_CONTENT)
def admin_bulk_delete_events(body: BulkDeleteEventsRequest, _: str = Depends(get_admin_user)) -> None:
    """Deletes each event and, via ON DELETE CASCADE, every one of its days."""
    for event_id in body.event_ids:
        try:
            supabase.table(Tables.EVENTS).delete().eq("id", event_id).execute()
        except Exception as e:
            logger.error("Failed to delete event %s during bulk delete: %s", event_id, e)


@router.post(AdminRoutes.EVENTS_BULK_SET_GROUP, status_code=status.HTTP_204_NO_CONTENT)
def admin_bulk_set_event_group(body: BulkSetEventGroupRequest, _: str = Depends(get_admin_user)) -> None:
    """Assign or clear the event_group_id filter label on multiple events."""
    for event_id in body.event_ids:
        try:
            supabase.table(Tables.EVENTS).update({"event_group_id": body.group_id}).eq("id", event_id).execute()
        except Exception as e:
            logger.error("Failed to set event_group_id for event %s: %s", event_id, e)


@router.post(AdminRoutes.EVENTS, response_model=Event, status_code=status.HTTP_201_CREATED)
def admin_create_event(body: AdminCreateEventRequest, _: str = Depends(get_admin_user)) -> Event:
    """Creates the parent event only — add its days separately via
    admin_create_event_day, which fires the "event created" Discord DM once
    the first day is added (there's no date to announce before that)."""
    event_data = {k: v for k, v in body.model_dump().items() if v is not None and v != ""}
    event_data.setdefault("is_hotel", False)
    try:
        resp = supabase.table(Tables.EVENTS).insert(event_data).execute()
    except Exception as e:
        logger.error("Failed to create event: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    return resp.data[0]


@router.put(AdminRoutes.EVENT_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_update_event(event_id: str, body: AdminUpdateEventRequest, _: str = Depends(get_admin_user)) -> None:
    updates = _build_updates(body, nullable_fields={
        "event_group_id", "hotel_location", "hotel_info", "image_url", "description",
        "location", "website", "ticket_url", "ticket_sale_start", "locker_info",
        "parking_info", "special_instructions", "what_to_bring",
    })
    if not updates:
        return
    try:
        resp = supabase.table(Tables.EVENTS).update(updates).eq("id", event_id).execute()
    except Exception as e:
        logger.error("Failed to update event %s: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evenement niet gevonden.")


@router.delete(AdminRoutes.EVENT_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_event(event_id: str, _: str = Depends(get_admin_user)) -> None:
    try:
        supabase.table(Tables.EVENTS).delete().eq("id", event_id).execute()
    except Exception as e:
        logger.error("Failed to delete event %s: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


# ── Event Days ─────────────────────────────────────────────────────────────────

@router.post(AdminRoutes.EVENT_DAYS, response_model=EventDay, status_code=status.HTTP_201_CREATED)
def admin_create_event_day(
    event_id: str,
    body: CreateEventDayRequest,
    background_tasks: BackgroundTasks,
    _: str = Depends(get_admin_user),
    settings: Settings = Depends(get_settings),
) -> EventDay:
    try:
        event_resp = supabase.table(Tables.EVENTS).select("event_name, location").eq("id", event_id).execute()
    except Exception as e:
        logger.error("Failed to fetch event %s for new day: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not event_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evenement niet gevonden.")

    try:
        existing_days = supabase.table(Tables.EVENT_DAYS).select("id").eq("event_id", event_id).execute().data
        resp = supabase.table(Tables.EVENT_DAYS).insert({
            "event_id": event_id,
            "date": body.date,
            "has_con": body.has_con,
        }).execute()
    except Exception as e:
        logger.error("Failed to create day for event %s: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if not existing_days:
        # First day added to a brand-new event — this is the moment there's
        # actually a date to announce, so the "event created" DM fires here
        # instead of at admin_create_event.
        event = event_resp.data[0]
        background_tasks.add_task(
            notification_service.broadcast_category_dm,
            settings.discord_bot_token,
            notification_service.NotificationCategory.EVENT_CREATED,
            M.DM_EVENT_CREATED.format(
                event_name=event["event_name"],
                date=body.date,
                location_line=f"\n📍 {event['location']}" if event.get("location") else "",
            ),
        )

    return resp.data[0]


@router.put(AdminRoutes.EVENT_DAY_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_update_event_day(
    day_id: str,
    body: UpdateEventDayRequest,
    _: str = Depends(get_admin_user),
) -> None:
    updates = _build_updates(body)
    if not updates:
        return
    try:
        resp = supabase.table(Tables.EVENT_DAYS).update(updates).eq("id", day_id).execute()
    except Exception as e:
        logger.error("Failed to update day %s: %s", day_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dag niet gevonden.")


@router.delete(AdminRoutes.EVENT_DAY_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_event_day(day_id: str, _: str = Depends(get_admin_user)) -> None:
    try:
        supabase.table(Tables.EVENT_DAYS).delete().eq("id", day_id).execute()
    except Exception as e:
        logger.error("Failed to delete day %s: %s", day_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.delete(AdminRoutes.EVENT_DAY_PARTICIPANT, status_code=status.HTTP_204_NO_CONTENT)
def admin_remove_event_participant(
    day_id: str, participant: str, _: str = Depends(get_admin_user)
) -> None:
    try:
        resp = supabase.table(Tables.EVENT_DAYS).select("participants").eq("id", day_id).execute()
    except Exception as e:
        logger.error("Failed to fetch day %s for participant removal: %s", day_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dag niet gevonden.")
    participants = [p for p in (resp.data[0].get("participants") or []) if p != participant]
    try:
        supabase.table(Tables.EVENT_DAYS).update({"participants": participants}).eq("id", day_id).execute()
    except Exception as e:
        logger.error("Failed to update participants for day %s: %s", day_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.EVENT_DAY_BULK_RSVP, status_code=status.HTTP_204_NO_CONTENT)
def admin_bulk_rsvp_event(day_id: str, body: BulkRsvpRequest, _: str = Depends(get_admin_user)) -> None:
    try:
        resp = supabase.table(Tables.EVENT_DAYS).select("participants").eq("id", day_id).execute()
    except Exception as e:
        logger.error("Failed to fetch day %s for bulk RSVP: %s", day_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dag niet gevonden.")

    participants = list(resp.data[0].get("participants") or [])
    new_names = [n for n in body.user_names if n not in participants]
    if new_names:
        participants.extend(new_names)
        try:
            supabase.table(Tables.EVENT_DAYS).update({"participants": participants}).eq("id", day_id).execute()
        except Exception as e:
            logger.error("Failed to update participants for day %s during bulk RSVP: %s", day_id, e)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


# ── Hotel Rooms (admin) ──────────────────────────────────────────────────────────
# event_id here is an event_days id, same as the user-facing hotel-rooms
# page already sends — _hotel_group_key resolves it to the real parent.

@router.get(AdminRoutes.EVENT_HOTEL_ROOMS, response_model=list[HotelRoom])
def admin_list_hotel_rooms(event_id: str, _: str = Depends(get_admin_user)) -> list[HotelRoom]:
    group_key, _ = _hotel_group_key(event_id)
    try:
        return supabase.table(Tables.HOTEL_ROOMS).select("*").eq("event_id", group_key).order("room_number").execute().data
    except Exception as e:
        logger.error("Failed to list hotel rooms for event %s: %s", event_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.put(AdminRoutes.EVENT_HOTEL_ROOM, status_code=status.HTTP_204_NO_CONTENT)
def admin_update_hotel_room(
    event_id: str,
    room_id: str,
    body: AdminUpdateHotelRoomRequest,
    _: str = Depends(get_admin_user),
) -> None:
    updates: dict = {}
    for field, value in body.model_dump(exclude_unset=False).items():
        if field in body.model_fields_set:
            updates[field] = value
        elif value is not None:
            updates[field] = value
    if not updates:
        return
    try:
        resp = supabase.table(Tables.HOTEL_ROOMS).update(updates).eq("id", room_id).execute()
    except Exception as e:
        logger.error("Failed to update hotel room %s: %s", room_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kamer niet gevonden.")


@router.delete(AdminRoutes.EVENT_HOTEL_ROOM, status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_hotel_room(
    event_id: str,
    room_id: str,
    _: str = Depends(get_admin_user),
) -> None:
    try:
        supabase.table(Tables.HOTEL_ROOMS).delete().eq("id", room_id).execute()
    except Exception as e:
        logger.error("Failed to delete hotel room %s: %s", room_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


# ── Event groups ────────────────────────────────────────────────────────────────

@router.get(AdminRoutes.EVENT_GROUPS, response_model=list[EventGroup])
def admin_list_event_groups(_: str = Depends(get_admin_user)) -> list[EventGroup]:
    try:
        return supabase.table(Tables.EVENT_GROUPS).select("*").order("name").execute().data
    except Exception as e:
        logger.error("Failed to list event groups: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.EVENT_GROUPS, response_model=EventGroup, status_code=status.HTTP_201_CREATED)
def admin_create_event_group(body: CreateEventGroupRequest, _: str = Depends(get_admin_user)) -> EventGroup:
    try:
        resp = supabase.table(Tables.EVENT_GROUPS).insert({"name": body.name}).execute()
    except Exception as e:
        logger.error("Failed to create event group %s: %s", body.name, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kon groep niet aanmaken.")
    return resp.data[0]


@router.put(AdminRoutes.EVENT_GROUP_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_update_event_group(group_id: str, body: UpdateEventGroupRequest, _: str = Depends(get_admin_user)) -> None:
    try:
        resp = supabase.table(Tables.EVENT_GROUPS).update({"name": body.name}).eq("id", group_id).execute()
    except Exception as e:
        logger.error("Failed to update event group %s: %s", group_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Groep niet gevonden.")


@router.delete(AdminRoutes.EVENT_GROUP_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_event_group(group_id: str, _: str = Depends(get_admin_user)) -> None:
    try:
        supabase.table(Tables.EVENT_GROUPS).delete().eq("id", group_id).execute()
    except Exception as e:
        logger.error("Failed to delete event group %s: %s", group_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.EVENT_GROUPS_BULK_DELETE, status_code=status.HTTP_204_NO_CONTENT)
def admin_bulk_delete_event_groups(body: BulkDeleteEventGroupsRequest, _: str = Depends(get_admin_user)) -> None:
    for group_id in body.group_ids:
        try:
            supabase.table(Tables.EVENT_GROUPS).delete().eq("id", group_id).execute()
        except Exception as e:
            logger.error("Failed to delete event group %s during bulk delete: %s", group_id, e)


# ── Badges ─────────────────────────────────────────────────────────────────────

@router.get(AdminRoutes.BADGES, response_model=list[Badge])
def admin_list_badges(_: str = Depends(get_admin_user)) -> list[Badge]:
    try:
        return supabase.table(Tables.BADGES).select("*").order("display_order").execute().data
    except Exception as e:
        logger.error("Failed to list badges: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.patch(AdminRoutes.BADGES_REORDER, status_code=status.HTTP_204_NO_CONTENT)
def admin_reorder_badges(body: list[BadgeOrderItem], _: str = Depends(get_admin_user)) -> None:
    for item in body:
        try:
            supabase.table(Tables.BADGES).update({"display_order": item.display_order}).eq("id", item.id).execute()
        except Exception as e:
            logger.error("Failed to reorder badge %s: %s", item.id, e)


@router.post(AdminRoutes.BADGES, response_model=Badge, status_code=status.HTTP_201_CREATED)
def admin_create_badge(body: CreateBadgeRequest, _: str = Depends(get_admin_user)) -> Badge:
    try:
        resp = supabase.table(Tables.BADGES).insert(body.model_dump()).execute()
        return resp.data[0]
    except Exception as e:
        logger.error("Failed to create badge: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.put(AdminRoutes.BADGE_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_update_badge(
    badge_id: str, body: UpdateBadgeRequest, _: str = Depends(get_admin_user)
) -> None:
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return
    try:
        resp = supabase.table(Tables.BADGES).update(updates).eq("id", badge_id).execute()
    except Exception as e:
        logger.error("Failed to update badge %s: %s", badge_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Badge niet gevonden.")


@router.delete(AdminRoutes.BADGE_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_badge(badge_id: str, _: str = Depends(get_admin_user)) -> None:
    try:
        users = supabase.table(Tables.PROFILES).select("id, badge_ids").execute().data
    except Exception as e:
        logger.error("Failed to fetch users for badge cleanup %s: %s", badge_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    for user in users:
        ids = user.get("badge_ids") or []
        if badge_id in ids:
            try:
                supabase.table(Tables.PROFILES).update(
                    {"badge_ids": [b for b in ids if b != badge_id]}
                ).eq("id", user["id"]).execute()
            except Exception as e:
                logger.error("Failed to remove badge %s from user %s: %s", badge_id, user["id"], e)

    try:
        supabase.table(Tables.BADGES).delete().eq("id", badge_id).execute()
    except Exception as e:
        logger.error("Failed to delete badge %s: %s", badge_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.USER_BADGE, status_code=status.HTTP_204_NO_CONTENT)
def admin_assign_badge(user_id: str, badge_id: str, _: str = Depends(get_admin_user)) -> None:
    try:
        resp = supabase.table(Tables.PROFILES).select("badge_ids").eq("id", user_id).execute()
    except Exception as e:
        logger.error("Failed to fetch user %s for badge assignment: %s", user_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")
    ids: list[str] = resp.data[0].get("badge_ids") or []
    if badge_id not in ids:
        try:
            supabase.table(Tables.PROFILES).update({"badge_ids": ids + [badge_id]}).eq("id", user_id).execute()
        except Exception as e:
            logger.error("Failed to assign badge %s to user %s: %s", badge_id, user_id, e)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.delete(AdminRoutes.USER_BADGE, status_code=status.HTTP_204_NO_CONTENT)
def admin_unassign_badge(user_id: str, badge_id: str, _: str = Depends(get_admin_user)) -> None:
    try:
        resp = supabase.table(Tables.PROFILES).select("badge_ids").eq("id", user_id).execute()
    except Exception as e:
        logger.error("Failed to fetch user %s for badge removal: %s", user_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gebruiker niet gevonden.")
    ids: list[str] = resp.data[0].get("badge_ids") or []
    try:
        supabase.table(Tables.PROFILES).update({"badge_ids": [b for b in ids if b != badge_id]}).eq("id", user_id).execute()
    except Exception as e:
        logger.error("Failed to unassign badge %s from user %s: %s", badge_id, user_id, e)


# ── Announcements ────────────────────────────────────────────────────────────

@router.get(AdminRoutes.ANNOUNCEMENTS, response_model=list[Announcement])
def admin_list_announcements(_: str = Depends(get_admin_user)) -> list[Announcement]:
    try:
        return (
            supabase.table(Tables.ANNOUNCEMENTS)
            .select("*")
            .order("created_at", desc=True)
            .execute()
            .data
        )
    except Exception as e:
        logger.error("Failed to list announcements: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.ANNOUNCEMENTS, response_model=Announcement, status_code=status.HTTP_201_CREATED)
def admin_create_announcement(
    body: CreateAnnouncementRequest,
    background_tasks: BackgroundTasks,
    admin: str = Depends(get_admin_user),
    settings: Settings = Depends(get_settings),
) -> Announcement:
    try:
        resp = (
            supabase.table(Tables.ANNOUNCEMENTS)
            .insert({**body.model_dump(), "created_by": admin})
            .execute()
        )
    except Exception as e:
        logger.error("Failed to create announcement: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)

    if body.notify_discord:
        background_tasks.add_task(
            discord_service.notify_announcement,
            settings.discord_webhook_url,
            settings.app_url,
            message=body.message,
            severity=body.severity,
        )

    return resp.data[0]


@router.put(AdminRoutes.ANNOUNCEMENT_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_update_announcement(
    announcement_id: str, body: UpdateAnnouncementRequest, _: str = Depends(get_admin_user)
) -> None:
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return
    try:
        resp = supabase.table(Tables.ANNOUNCEMENTS).update(updates).eq("id", announcement_id).execute()
    except Exception as e:
        logger.error("Failed to update announcement %s: %s", announcement_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aankondiging niet gevonden.")


@router.delete(AdminRoutes.ANNOUNCEMENT_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_announcement(announcement_id: str, _: str = Depends(get_admin_user)) -> None:
    try:
        supabase.table(Tables.ANNOUNCEMENTS).delete().eq("id", announcement_id).execute()
    except Exception as e:
        logger.error("Failed to delete announcement %s: %s", announcement_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


# ── Changelog ──────────────────────────────────────────────────────────────────

@router.get(AdminRoutes.CHANGELOG, response_model=list[ChangelogEntry])
def admin_list_changelog_entries(_: str = Depends(get_admin_user)) -> list[ChangelogEntry]:
    try:
        return (
            supabase.table(Tables.CHANGELOG_ENTRIES)
            .select("*")
            .order("released_at", desc=True)
            .order("created_at", desc=True)
            .execute()
            .data
        )
    except Exception as e:
        logger.error("Failed to list changelog entries: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


@router.post(AdminRoutes.CHANGELOG, response_model=ChangelogEntry, status_code=status.HTTP_201_CREATED)
def admin_create_changelog_entry(
    body: CreateChangelogEntryRequest,
    admin: str = Depends(get_admin_user),
) -> ChangelogEntry:
    try:
        resp = (
            supabase.table(Tables.CHANGELOG_ENTRIES)
            .insert({**body.model_dump(), "created_by": admin})
            .execute()
        )
    except Exception as e:
        logger.error("Failed to create changelog entry: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    return resp.data[0]


@router.put(AdminRoutes.CHANGELOG_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_update_changelog_entry(
    entry_id: str, body: UpdateChangelogEntryRequest, _: str = Depends(get_admin_user)
) -> None:
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return
    try:
        resp = supabase.table(Tables.CHANGELOG_ENTRIES).update(updates).eq("id", entry_id).execute()
    except Exception as e:
        logger.error("Failed to update changelog entry %s: %s", entry_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wijzigingslog-item niet gevonden.")


@router.delete(AdminRoutes.CHANGELOG_DETAIL, status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_changelog_entry(entry_id: str, _: str = Depends(get_admin_user)) -> None:
    try:
        supabase.table(Tables.CHANGELOG_ENTRIES).delete().eq("id", entry_id).execute()
    except Exception as e:
        logger.error("Failed to delete changelog entry %s: %s", entry_id, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)


# ── Image uploads ──────────────────────────────────────────────────────────────

def _store_admin_image(kind: str, folder: str, content: bytes) -> dict:
    content, content_type, ext = clean_image(content, {"JPEG", "PNG", "WEBP"})
    key = f"{folder}/{uuid.uuid4().hex}.{ext}"
    try:
        return {"url": minio_client.upload_bytes(key, content, content_type)}
    except RuntimeError as e:
        logger.error("%s upload failed (MinIO not configured): %s", kind, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.error("MinIO upload of a %s failed: %s", kind, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Uploaden mislukt. Probeer het opnieuw.")


@router.post(AdminRoutes.UPLOAD_IMAGE)
async def admin_upload_image(
    kind: str,
    file: UploadFile = File(...),
    _: str = Depends(get_admin_user),
) -> dict:
    """Store an event cover or badge image in MinIO and return its public URL.

    These used to be uploaded from the browser straight into Supabase Storage,
    which meant storage had to accept writes from any signed-in Supabase user —
    including people who aren't on the whitelist. Now only the backend (and so
    only admins) can write them, next to the rest of the app's images.
    """
    folder = _IMAGE_FOLDERS.get(kind)
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Onbekend soort afbeelding.")

    content = await read_capped(file, _IMAGE_MAX_BYTES)
    return await run_in_threadpool(_store_admin_image, kind, folder, content)


def _store_quick_upload(content: bytes) -> dict:
    video = sniff_video(content)
    if video:
        content_type, ext = video
        media = "video"
    else:
        if len(content) > _IMAGE_MAX_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Afbeelding te groot. Maximum is {_IMAGE_MAX_BYTES // (1024 * 1024)} MB.",
            )
        try:
            content, content_type, ext = clean_image(content, {"JPEG", "PNG", "WEBP", "GIF"})
        except HTTPException:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Alleen afbeeldingen (JPG, PNG, WebP, GIF) en video's (MP4, MOV, WebM) zijn toegestaan.",
            )
        media = "image"
    key = f"uploads/{uuid.uuid4().hex}.{ext}"
    try:
        url = minio_client.upload_bytes(key, content, content_type)
    except RuntimeError as e:
        logger.error("Quick upload failed (MinIO not configured): %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.error("MinIO quick upload failed: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Uploaden mislukt. Probeer het opnieuw.")
    return {"url": url, "key": key, "media": media, "size": len(content)}


@router.post(AdminRoutes.QUICK_UPLOAD)
async def admin_quick_upload(
    file: UploadFile = File(...),
    _: str = Depends(get_admin_user),
) -> dict:
    """Upload an image or video to embed somewhere, and get its public URL.

    Only what the bytes really are is accepted: images are re-encoded (which
    also strips their location data), videos are checked by their file header
    and stored as they are. Nothing else — no HTML, SVG or PDF — can be stored
    here, so a link to an upload can never run a script in someone's browser.
    """
    content = await read_capped(file, _VIDEO_MAX_BYTES)
    return await run_in_threadpool(_store_quick_upload, content)


# ── CDN (the whole photo bucket) ───────────────────────────────────────────────

_CDN_FOLDER_KINDS = {
    "cosplay": "cosplay", "banners": "banner", "badges": "badge", "event-covers": "event-cover", "uploads": "upload",
}


_STORY_KEY = re.compile(r"^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$")


def _cdn_kind(key: str) -> str:
    """Folders named after a feature are that feature's; story photos live
    under <event id>/<day id>/; anything else is something we didn't put there."""
    kind = _CDN_FOLDER_KINDS.get(key.split("/", 1)[0])
    if kind:
        return kind
    return "story" if _STORY_KEY.match(key) else "other"


def _cdn_owners(items: list[dict]) -> dict[str, str]:
    """key -> who uploaded it, for what the database can tell us. Best effort:
    a failed lookup just leaves those without an owner."""
    owners: dict[str, str] = {}
    urls = {i["url"]: i["key"] for i in items}
    story_urls = [i["url"] for i in items if i["kind"] == "story"]
    if story_urls:
        try:
            rows = supabase.table(Tables.STORY_PHOTOS).select("image_url, uploaded_by").in_("image_url", story_urls).execute().data or []
            for r in rows:
                owners[urls[r["image_url"]]] = r["uploaded_by"]
        except Exception as e:
            logger.error("CDN: story owner lookup failed: %s", e)
    banner_items = [i for i in items if i["kind"] == "banner"]
    if banner_items:
        try:
            names = {p["id"]: p["name"] for p in supabase.table(Tables.PROFILES).select("id, name").execute().data or []}
            for i in banner_items:
                parts = i["key"].split("/")  # banners/<user id>/<file>
                if len(parts) >= 3 and parts[1] in names:
                    owners[i["key"]] = names[parts[1]]
        except Exception as e:
            logger.error("CDN: banner owner lookup failed: %s", e)
    cosplay_urls = [i["url"] for i in items if i["kind"] == "cosplay"]
    if cosplay_urls:
        try:
            rows = supabase.table(Tables.COSPLAYS).select("user_name, inspo_images").overlaps("inspo_images", cosplay_urls).execute().data or []
            for r in rows:
                for u in r.get("inspo_images") or []:
                    if u in urls:
                        owners[urls[u]] = r["user_name"]
        except Exception as e:
            logger.error("CDN: cosplay owner lookup failed: %s", e)
    return owners


@router.get(AdminRoutes.CDN, response_model=CdnListing)
def admin_cdn(
    limit: int = Query(60, ge=1, le=300),
    offset: int = Query(0, ge=0),
    kind: Optional[str] = None,
    _: str = Depends(get_admin_user),
) -> CdnListing:
    """Every file in the photo bucket, newest first — so an admin can look for
    anything that shouldn't be there. `kind` narrows it to one feature."""
    try:
        objects, capped = minio_client.list_all_objects()
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.error("CDN: listing the bucket failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="De bucket kon niet worden uitgelezen. Controleer of MinIO bereikbaar is en de sleutel mag lijsten.",
        )

    for o in objects:
        o["kind"] = _cdn_kind(o["key"])
    counts: dict[str, int] = {}
    for o in objects:
        counts[o["kind"]] = counts.get(o["kind"], 0) + 1
    chosen = [o for o in objects if o["kind"] == kind] if kind else objects
    page = chosen[offset:offset + limit]
    owners = _cdn_owners(page)
    return CdnListing(
        total=len(chosen),
        total_size=sum(o["size"] for o in chosen),
        capped=capped,
        counts=counts,
        items=[CdnObject(**o, owner=owners.get(o["key"])) for o in page],
    )
