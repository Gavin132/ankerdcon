"""
Centralized route path definitions for the Ankerd Con API.

All path strings used in router decorators are defined here.
Import the relevant class instead of writing magic strings in route decorators.
"""


class RideRoutes:
    PREFIX = "/rides"
    LIST = "/"
    CLAIM = "/{ride_id}/claim"
    LEAVE = "/{ride_id}/leave"
    RESTAURANT_DRIVER = "/{ride_id}/restaurant-driver"
    RESTAURANT_DRIVER_LEAVE = "/{ride_id}/restaurant-driver/leave"
    RESTAURANT_DRIVER_ASSIGN = "/{ride_id}/restaurant-driver/assign"
    RESTAURANT_DRIVER_UNASSIGN = "/{ride_id}/restaurant-driver/unassign"


class CalendarRoutes:
    PREFIX = "/calendar"
    FEED = "/feed.ics"
    LIST = "/"
    RSVP = "/{event_id}/rsvp"
    LEAVE = "/{event_id}/leave"
    HOTEL_ROOMS = "/{event_id}/hotel-rooms"
    HOTEL_ROOM_ASSIGN = "/{event_id}/hotel-rooms/{room_id}/assign"
    HOTEL_ROOM_LEAVE = "/{event_id}/hotel-rooms/{room_id}/leave"


class UserRoutes:
    PREFIX = "/users"
    NAMES = "/names"
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


class CosplayRoutes:
    PREFIX = "/cosplays"
    LIST = "/"
    DETAIL = "/{cosplay_id}"


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

    # Users
    USERS = "/users"
    USER_DETAIL = "/users/{user_id}"
    USERS_BULK_DELETE = "/users/bulk-delete"
    USERS_BULK_DEACTIVATE = "/users/bulk-deactivate"
    USER_BADGE = "/users/{user_id}/badges/{badge_id}"
    IMPERSONATE = "/impersonate/{user_id}"

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

    # Calendar
    CALENDAR = "/calendar"
    CALENDAR_BULK_DELETE = "/calendar/bulk-delete"
    CALENDAR_BULK_GROUP = "/calendar/bulk-group"
    CALENDAR_BULK_SET_GROUP = "/calendar/bulk-set-group"
    CALENDAR_EVENT = "/calendar/{event_id}"
    CALENDAR_EVENT_GROUP = "/calendar/{event_id}/group"
    CALENDAR_EVENT_PARTICIPANT = "/calendar/{event_id}/participants/{participant}"
    CALENDAR_EVENT_BULK_RSVP = "/calendar/{event_id}/bulk-rsvp"
    CALENDAR_EVENT_SYNC_GROUP = "/calendar/{event_id}/sync-group"
    CALENDAR_EVENT_HOTEL_ROOMS = "/calendar/{event_id}/hotel-rooms"
    CALENDAR_EVENT_HOTEL_ROOM = "/calendar/{event_id}/hotel-rooms/{room_id}"

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
