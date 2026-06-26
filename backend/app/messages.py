"""
All user-facing message copy for Discord — both bot DMs and webhook embeds.

Edit this file to change what users see. No service logic lives here.
"""

from __future__ import annotations

# ══════════════════════════════════════════════════════════════════════════════
# Bot DMs
# ══════════════════════════════════════════════════════════════════════════════

DM_WELCOME = """\
👋 **Welkom bij Ankerd Con, {name}!**

Je bent toegevoegd aan het platform door een beheerder.

Via de app heb je toegang tot:
• Evenementen bekijken en aanmelden
• Transport en maaltijden plannen
• Je profiel instellen

Open de app om aan de slag te gaan.

Groet,
*De officiële Ankerd Con Bot*
"""

DM_DEACTIVATED = """\
⚠️ **Je Ankerd Con-account is gedeactiveerd.**

Je hebt momenteel geen toegang meer tot het platform. Neem contact op met een van de beheerders voor meer informatie.

Groet,
*De officiële Ankerd Con Bot*
"""

DM_REMOVED = """\
❌ **Je bent verwijderd uit Ankerd Con.**

Je account is verwijderd en je hebt geen toegang meer tot het platform. Neem contact op met een van de beheerders voor meer informatie.

Groet,
*De officiële Ankerd Con Bot*
"""

# ══════════════════════════════════════════════════════════════════════════════
# Webhook embed titles
# ══════════════════════════════════════════════════════════════════════════════

EMBED_EVENT_TITLE   = "📅  {event_name}"
EMBED_RIDE_TITLE    = "🚗  Nieuwe rit — {direction}"
EMBED_MEAL_TITLE    = "🍽️  {meal_name}"
EMBED_TICKET_TITLE  = "🎟️  Kaartverkoop"
EMBED_REMINDER_TITLE = "{icon}  {event_name} — {urgency}"

# ── Reminder urgency levels: label → (icon, Dutch label, embed colour) ────────

REMINDER_LEVELS: dict[str, tuple[str, str, int]] = {
    "7d":     ("📆", "Over een week!",        0x818CF8),  # indigo
    "1d":     ("⏰", "Morgen is het zover!",  0xFBBF24),  # amber
    "day_of": ("🎉", "Vandaag is het zover!", 0x34D399),  # emerald
}

# ══════════════════════════════════════════════════════════════════════════════
# Webhook field labels (emoji + Dutch text)
# ══════════════════════════════════════════════════════════════════════════════

FIELD_DATE           = "📅 Datum"
FIELD_LOCATION       = "📍 Locatie"
FIELD_WEATHER        = "Weer"
FIELD_TICKET_SALE    = "🗓️ Kaartverkoop start"
FIELD_TICKETS        = "🎫 Tickets"
FIELD_LOCKERS        = "🔒 Lockers"
FIELD_PARKING        = "🅿️ Parkeren"
FIELD_WHAT_TO_BRING  = "🎒 Meenemen"

FIELD_DRIVER         = "🧑‍✈️ Chauffeur"
FIELD_DEPARTURE      = "🕐 Vertrek"
FIELD_START_LOCATION = "📍 Startpunt"
FIELD_SEATS          = "💺 Plekken"
FIELD_VEHICLE_TYPE   = "🚆 Type"
FIELD_ACTION_REQ     = "⚠️ Actie vereist"

FIELD_MEAL_TIME      = "🕐 Tijd"
FIELD_MEAL_COST      = "💶 Kosten"
FIELD_MEAL_TRANSPORT = "🚌 Transport"

# ══════════════════════════════════════════════════════════════════════════════
# Webhook action link labels
# ══════════════════════════════════════════════════════════════════════════════

LINK_APP_TRANSPORT = "📱 Open de app"
LINK_APP_FOOD      = "📱 Open de app"
LINK_APP_CALENDAR  = "📱 Open de app"
LINK_TICKETS       = "🎟️ Koop tickets"
LINK_WEBSITE       = "🌐 Website"
LINK_MAPS          = "🗺️ Google Maps"
