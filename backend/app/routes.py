"""
Centralized route path definitions for the Ankerd Con API.

All path strings used in router decorators are defined here.
Import the relevant class instead of writing magic strings in route decorators.
"""


class RideRoutes:
    PREFIX = "/rides"
    LIST = "/"
    DETAIL = "/{ride_id}"
    CLAIM = "/{ride_id}/claim"
    LEAVE = "/{ride_id}/leave"
    RESTAURANT_DRIVER = "/{ride_id}/restaurant-driver"
    RESTAURANT_DRIVER_LEAVE = "/{ride_id}/restaurant-driver/leave"
    RESTAURANT_DRIVER_ASSIGN = "/{ride_id}/restaurant-driver/assign"
    RESTAURANT_DRIVER_UNASSIGN = "/{ride_id}/restaurant-driver/unassign"


class CalendarRoutes:
    PREFIX = "/calendar"
    FEED = "/feed.ics"
    FEED_URL = "/feed-url"
    LIST = "/"
    RSVP = "/{event_id}/rsvp"
    LEAVE = "/{event_id}/leave"
    HOTEL_ROOMS = "/{event_id}/hotel-rooms"
    HOTEL_ROOMS_BULK = "/{event_id}/hotel-rooms/bulk"
    HOTEL_ROOM_ASSIGN = "/{event_id}/hotel-rooms/{room_id}/assign"
    HOTEL_ROOM_LEAVE = "/{event_id}/hotel-rooms/{room_id}/leave"


class UserRoutes:
    PREFIX = "/users"
    LIST = "/"
    PREFERENCES = "/preferences"
    NAME = "/name"
    LOCATION = "/{identifier}/location"
    ONBOARDING = "/me/onboarding"
    ME = "/me"
    DETAIL = "/{identifier}"
    BANNER = "/banner"
    LINK_DISCORD = "/me/link-discord"


class MealRoutes:
    PREFIX = "/meals"
    LIST = "/"
    RSVP = "/{meal_id}/rsvp"
    CANCEL_RSVP = "/{meal_id}/cancel-rsvp"
    DETAIL = "/{meal_id}"


class PaymentRoutes:
    PREFIX = "/payments"
    LIST = "/"
    DETAIL = "/{payment_id}"


class ExpenseRoutes:
    PREFIX = "/expenses"
    LIST = "/"
    DETAIL = "/{expense_id}"
    SHARE_CLAIM = "/shares/{share_id}/claim"
    SHARE_CONFIRM = "/shares/{share_id}/confirm"


class SettlementRoutes:
    PREFIX = "/settlements"
    LIST = "/"
    DETAIL = "/{settlement_id}"
    PAID = "/{settlement_id}/paid"
    CONFIRM = "/{settlement_id}/confirm"


class CosplayRoutes:
    PREFIX = "/cosplays"
    LIST = "/"
    DETAIL = "/{cosplay_id}"
    IMAGE = "/images"  # POST — upload an inspiration image, returns its URL


class StoryRoutes:
    PREFIX = "/stories"
    LIST = "/{event_day_id}"          # GET list / POST upload
    DETAIL = "/photos/{photo_id}"     # DELETE (owner-only)
    DOWNLOAD = "/photos/{photo_id}/download"  # GET — original bytes, forced download
    SEEN = "/{event_day_id}/seen"     # GET / PUT
    SUMMARY = "/summary"              # GET ?event_day_ids=a,b,c
    BY_USER = "/user/{identifier}"    # GET — every photo one member uploaded, with its event


class BadgeRoutes:
    PREFIX = "/badges"
    LIST = "/"


class AnnouncementRoutes:
    PREFIX = "/announcements"
    ACTIVE = "/active"


class ChangelogRoutes:
    PREFIX = "/changelog"
    LIST = "/"


class AdminRoutes:
    PREFIX = "/admin"
    STATS = "/stats"

    # CDN — everything in the photo bucket
    CDN = "/cdn"

    # Users
    USERS = "/users"
    USER_DETAIL = "/users/{user_id}"
    USERS_BULK_DELETE = "/users/bulk-delete"
    USERS_BULK_DEACTIVATE = "/users/bulk-deactivate"
    USER_BADGE = "/users/{user_id}/badges/{badge_id}"
    IMPERSONATE = "/impersonate/{user_id}"

    # Images (event covers, badges) — uploaded through the backend, never
    # straight from the browser to storage.
    UPLOAD_IMAGE = "/uploads/{kind}"

    # Rides
    RIDES = "/rides"
    RIDE_DETAIL = "/rides/{ride_id}"
    RIDES_BULK_DELETE = "/rides/bulk-delete"
    RIDE_PASSENGER = "/rides/{ride_id}/passengers/{passenger}"

    # Meals
    MEALS = "/meals"
    MEAL_DETAIL = "/meals/{meal_id}"
    MEALS_BULK_DELETE = "/meals/bulk-delete"
    MEAL_PARTICIPANT = "/meals/{meal_id}/participants/{participant}"

    # Events (a trip/convention) and its Days
    EVENTS = "/events"
    EVENTS_BULK_DELETE = "/events/bulk-delete"
    EVENTS_BULK_SET_GROUP = "/events/bulk-set-group"
    EVENT_DETAIL = "/events/{event_id}"
    EVENT_DAYS_ALL = "/event-days"
    EVENT_DAYS = "/events/{event_id}/days"  # POST (create) only — needs the parent for context
    EVENT_DAY_DETAIL = "/event-days/{day_id}"
    EVENT_DAY_PARTICIPANT = "/event-days/{day_id}/participants/{participant}"
    EVENT_DAY_BULK_RSVP = "/event-days/{day_id}/bulk-rsvp"
    EVENT_HOTEL_ROOMS = "/calendar/{event_id}/hotel-rooms"
    EVENT_HOTEL_ROOM = "/calendar/{event_id}/hotel-rooms/{room_id}"

    # Event groups
    EVENT_GROUPS = "/event-groups"
    EVENT_GROUP_DETAIL = "/event-groups/{group_id}"
    EVENT_GROUPS_BULK_DELETE = "/event-groups/bulk-delete"

    # Badges
    BADGES = "/badges"
    BADGES_REORDER = "/badges/reorder"
    BADGE_DETAIL = "/badges/{badge_id}"

    # Announcements
    ANNOUNCEMENTS = "/announcements"
    ANNOUNCEMENT_DETAIL = "/announcements/{announcement_id}"

    # Changelog
    CHANGELOG = "/changelog"
    CHANGELOG_DETAIL = "/changelog/{entry_id}"

    # Expenses
    EXPENSE_DETAIL = "/expenses/{expense_id}"
    EXPENSE_SHARE_DETAIL = "/expense-shares/{share_id}"

    # Whitelist
    WHITELIST = "/whitelist"
    WHITELIST_DETAIL = "/whitelist/{entry_id}"
