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
# Per-category DM notifications
# ══════════════════════════════════════════════════════════════════════════════
# Opt-in, per-user — separate from (and additional to) the shared webhook
# channel above, which always posts everything regardless of these.

DM_EVENT_CREATED = "📅 **Nieuw evenement: {event_name}**\n📅 {date}{location_line}\n\nOpen de app voor alle details."
DM_TICKET_SALE_24H = "🎟️ **Kaartverkoop voor {event_name} start over 24 uur!**\n🗓️ {ticket_sale_start}\n\nZet een wekker — populaire tickets gaan snel."
DM_TICKET_SALE_OPEN = "🎟️ **De kaartverkoop voor {event_name} is nu geopend!**\n\nOpen de app voor meer info."
DM_EVENT_REMINDER_7D = "📆 **Over een week is het zover: {event_name}**\n📅 {date}{location_line}"
DM_EVENT_REMINDER_1D = "⏰ **Morgen is het zover: {event_name}**\n📅 {date}{location_line}"
DM_EVENT_REMINDER_DAY_OF = "🎉 **Vandaag is het zover: {event_name}!**{location_line}"
DM_RIDE_CREATED = "🚗 **{driver} heeft een nieuwe rit aangemaakt**\n🕐 Vertrek: {departure_time}\n📍 Vanaf: {start_location}\n\nOpen de app om je aan te melden."
DM_EXPENSE_CREATED = "💸 **{paid_by} heeft een nieuwe uitgave toegevoegd**\n💰 {amount:.2f} {currency} — {description}\n\nOpen de app om je aandeel te verrekenen."
DM_MEAL_CREATED = "🍽️ **Nieuwe maaltijd: {meal_name}**\n🕐 {time}{location_line}\n\nOpen de app om je aan te melden."

# ══════════════════════════════════════════════════════════════════════════════
# Webhook embed titles
# ══════════════════════════════════════════════════════════════════════════════

EMBED_EVENT_TITLE    = "📅  {event_name}"
EMBED_RIDE_TITLE     = "🚗  Nieuwe rit — {direction}"
EMBED_MEAL_TITLE     = "🍽️  {meal_name}"
EMBED_TICKET_TITLE   = "🎟️  Kaartverkoop"
EMBED_REMINDER_TITLE = "{icon}  {event_name} — {urgency}"
EMBED_EXPENSE_TITLE  = "💸  {description}"

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
LINK_APP_FINANCE   = "📱 Open de app"
LINK_TICKETS       = "🎟️ Koop tickets"
LINK_WEBSITE       = "🌐 Website"
LINK_MAPS          = "🗺️ Google Maps"

FIELD_EXPENSE_PAYER  = "💳 Betaald door"
FIELD_EXPENSE_AMOUNT = "💰 Totaalbedrag"
FIELD_EXPENSE_SHARES = "👥 Verdeling"

EXPENSE_INTRO = "**{paid_by}** heeft een nieuwe groepsuitgave aangemaakt. Open de app om je aandeel te verrekenen."
