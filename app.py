import json
import random
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Dict, List, Optional

import gspread
import pandas as pd
import requests
import streamlit as st
from google.oauth2.service_account import Credentials
from streamlit_option_menu import option_menu
from streamlit_autorefresh import st_autorefresh


# Mobile-first dark theme styling
st.set_page_config(page_title="Ankerd Con App", layout="centered", page_icon="🛡️", initial_sidebar_state="collapsed")

st.markdown(
    """
    <style>
    :root { color-scheme: dark; }
    body, .stApp, .css-1d391kg { background-color: #0b1320; color: #e6e8ef; }
    .block-container { padding: 2rem 1rem 2rem 1rem !important; max-width: 600px; }
    .stButton>button, .stDownloadButton>button { background-color: #7c3aed; color: #ffffff; border-radius: 0.8rem; border: none; font-weight: bold; }
    .stButton>button:hover { background-color: #6d28d9; }
    .stTextInput>div>div>input, .stSelectbox>div>div>div>input, .stNumberInput>div>div>input { background-color: #111827; color: #e6e8ef; border-radius: 0.8rem; border: 1px solid #374151; }
    .streamlit-expanderHeader { background-color: #1f2937; border-radius: 0.5rem; color: #e6e8ef; font-weight: bold; }
    div[data-testid="stExpander"] { border: none !important; margin-bottom: 1rem; }
    .stMarkdown { color: #e6e8ef; }
    .stApp .css-1d391kg .main { background-color: #0b1320; }
    .feed-card { background-color: #111827; padding: 1rem; border-radius: 0.8rem; border: 1px solid #1f2937; margin-bottom: 0.8rem; }
    .ping-time { color: #9ca3af; font-size: 0.8rem; margin-bottom: 0.2rem; }
    .ping-text { font-size: 1rem; margin-top: 0; }
    .zone-badge { display: inline-block; background-color: #374151; color: #d1d5db; font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 4px; margin-bottom: 0.3rem; }
    .calendar-badge { display: inline-block; font-size: 0.75rem; font-weight: bold; padding: 0.15rem 0.5rem; border-radius: 6px; margin-bottom: 0.4rem; }
    </style>
    """,
    unsafe_allow_html=True,
)


USER_COLS = {
    "Name": 1,
    "Phone Number": 2,
    "Hotel Room": 3,
    "Live Location Ping": 4,
}
RIDES_COLS = {
    "Direction": 1,
    "Vehicle Type": 2,
    "Driver": 3,
    "Departure Time": 4,
    "Start Location": 5,
    "Total Seats": 6,
    "Passengers": 7,
}
MEALS_COLS = {
    "Meal Name": 1,
    "Time": 2,
    "Location (Optional)": 3,
    "Cost": 4,
    "RSVPs": 5,
}
PAYMENTS_COLS = {
    "Paid By": 1,
    "Amount": 2,
    "Description": 3,
    "Date": 4,
}

MAP_ZONES = {
    "Tokyo Big Sight (Con Venue)": [35.6306, 139.7933],
    "Akihabara (Merch Run)": [35.6983, 139.7731],
    "Hotel": [35.6325, 139.7950],
    "Food/Lunch Spot": [35.6280, 139.7940],
    "Off-site: City Center": [35.6895, 139.6917]
}


def get_local_now() -> datetime:
    return pd.Timestamp.now(tz="Europe/Amsterdam").tz_localize(None).to_pydatetime()


def send_discord_notification(title: str, message: str) -> None:
    webhook_url = st.secrets.get("webhooks", {}).get("discord")
    if not webhook_url: return
    payload = {
        "username": "Ankerd Con Bot",
        "embeds": [{"title": title, "description": message, "color": 0x5b6f9f, "timestamp": get_local_now().isoformat()}],
    }
    try: requests.post(webhook_url, json=payload, timeout=5)
    except requests.RequestException: pass


@st.cache_resource
def get_gsheet_client() -> gspread.Client:
    credentials_info = st.secrets.get("google_service_account")
    if not credentials_info: raise RuntimeError("Missing Google service account credentials in st.secrets.")
    credentials = Credentials.from_service_account_info(credentials_info, scopes=["https://www.googleapis.com/auth/spreadsheets"])
    return gspread.authorize(credentials)


@st.cache_resource
def get_gsheet() -> gspread.Spreadsheet:
    sheet_id = st.secrets.get("google_sheets", {}).get("sheet_id")
    if not sheet_id: raise RuntimeError("Missing google_sheets.sheet_id in st.secrets.")
    return get_gsheet_client().open_by_key(sheet_id)


# MEGA SPEED UPGRADE: Fetching all tabs in a single API call instead of 5 separate ones.
@st.cache_data(ttl=60)
def get_all_tables() -> Dict[str, pd.DataFrame]:
    spreadsheet = get_gsheet()
    tab_names = ["Users", "Rides", "Meals", "Payments", "Calendar"]
    ranges = [f"{tab}!A:Z" for tab in tab_names]
    
    try:
        response = spreadsheet.values_batch_get(ranges)
        value_ranges = response.get('valueRanges', [])
    except Exception as e:
        st.error(f"Failed to fetch database: {e}")
        return {tab: pd.DataFrame() for tab in tab_names}

    dfs = {}
    for i, tab in enumerate(tab_names):
        if i < len(value_ranges):
            values = value_ranges[i].get('values', [])
            if not values:
                dfs[tab] = pd.DataFrame()
            elif len(values) == 1:
                dfs[tab] = pd.DataFrame(columns=values[0])
            else:
                headers = values[0]
                max_cols = len(headers)
                # Google Sheets omits empty trailing cells, so we pad them back in
                padded_rows = [row + [""] * (max_cols - len(row)) for row in values[1:]]
                df = pd.DataFrame(padded_rows, columns=headers)
                df = df.astype(str).replace("nan", "", regex=False)
                df["row_number"] = df.index + 2
                dfs[tab] = df
        else:
            dfs[tab] = pd.DataFrame()
    return dfs


def update_sheet_cell(tab_name: str, row_number: int, col_number: int, value: str) -> None:
    get_gsheet().worksheet(tab_name).update_cell(row_number, col_number, value)


def append_sheet_row(tab_name: str, values: List[str]) -> None:
    get_gsheet().worksheet(tab_name).append_row(values, value_input_option="USER_ENTERED")


def parse_datetime(value: str) -> Optional[datetime]:
    try:
        # Added dayfirst=True to handle Google Sheets regional auto-formatting
        parsed = pd.to_datetime(value, errors="coerce", dayfirst=True)
        if pd.isna(parsed): return None
        return parsed.to_pydatetime()
    except Exception: return None


def normalize_list_field(value: str) -> List[str]:
    return [item.strip() for item in str(value).split(",") if item.strip()]


def update_user_location(user_name: str, zone: str, location_text: str) -> None:
    users_df = get_all_tables()["Users"]
    user = users_df[users_df["Name"] == user_name]
    if user.empty: return
    row_number = int(user.iloc[0]["row_number"])
    
    current_time = get_local_now().strftime("%H:%M")
    ping_with_time = f"{zone}|{location_text} (at {current_time})"
    
    update_sheet_cell("Users", row_number, USER_COLS["Live Location Ping"], ping_with_time)
    get_all_tables.clear()
    send_discord_notification("Location Ping Updated", f"{user_name} is in {zone}: {location_text}")
    st.success(f"Ping updated to: {zone} - {location_text}")


def update_user_car(user_name: str, direction: str, car_label: str) -> None:
    users_df = get_all_tables()["Users"]
    user = users_df[users_df["Name"] == user_name]
    if user.empty:
        return

    row_number = int(user.iloc[0]["row_number"])
    col_name = "Inbound Car" if direction == "Inbound" else "Outbound Car"
    update_sheet_cell("Users", row_number, USER_COLS[col_name], car_label)
    get_all_tables.clear()


def claim_ride_seat(user_name: str, ride_row: Dict[str, str], direction: str) -> None:
    current_passengers = normalize_list_field(ride_row.get("Passengers", ""))
    if user_name in current_passengers:
        st.warning("You are already on this transport.")
        return

    is_pt = str(ride_row.get("Vehicle Type", "")).strip().lower() == "public transport"
    seats_left = max(int(ride_row.get("Total Seats", 0)) - len(current_passengers), 0)
    
    if not is_pt and seats_left <= 0:
        st.error("This ride has no seats left.")
        return

    current_passengers.append(user_name)
    passenger_text = ", ".join(current_passengers)
    update_sheet_cell("Rides", int(ride_row["row_number"]), RIDES_COLS["Passengers"], passenger_text)
    update_user_car(user_name, direction, f"{ride_row['Driver']} @ {ride_row['Departure Time']}")
    get_all_tables.clear()
    st.success(f"Seat claimed!")


def create_ride(direction: str, vehicle_type: str, driver: str, departure_time: str, start_location: str, total_seats: int) -> None:
    append_sheet_row("Rides", [direction, vehicle_type, driver, departure_time, start_location, str(total_seats), ""])
    get_all_tables.clear()
    veh_icon = "🚆 Train/Bus" if vehicle_type == "Public Transport" else "🚗 Car"
    send_discord_notification("New Transport Added", f"A new {direction} {veh_icon} departs from {start_location} at {departure_time}.")
    st.success("New transport added.")


def create_meal(meal_name: str, meal_time: str, location: str, cost: str) -> None:
    append_sheet_row("Meals", [meal_name, meal_time, location, cost, ""])
    get_all_tables.clear()
    send_discord_notification("New Meal Added", f"New meal: {meal_name} at {meal_time}.")
    st.success("Meal plan created.")


def rsvp_meal(user_name: str, meal_row: Dict[str, str]) -> None:
    current_rsvps = normalize_list_field(meal_row.get("RSVPs", ""))
    if user_name in current_rsvps: return
    current_rsvps.append(user_name)
    update_sheet_cell("Meals", int(meal_row["row_number"]), MEALS_COLS["RSVPs"], ", ".join(current_rsvps))
    get_all_tables.clear()
    st.success(f"RSVP recorded!")


def log_payment(paid_by: str, amount: str, description: str, date_text: str) -> None:
    append_sheet_row("Payments", [paid_by, amount, description, date_text])
    get_all_tables.clear()
    st.success("Payment logged.")


# --- HUB TAB ---
def render_hub_tab(users_df: pd.DataFrame, rides_df: pd.DataFrame, meals_df: pd.DataFrame, calendar_df: pd.DataFrame) -> None:
    st.markdown("## 🗺️ The Hub")
    st.markdown("#### 🚨 Daily Action Check")
    
    now = get_local_now()
    today_str = now.strftime("%Y-%m-%d")
    
    active_dates = {}
    hotel_required_dates = {} # NEW: Track if a hotel is actually needed today
    
    if not calendar_df.empty:
        for _, event in calendar_df.iterrows():
            raw_date_str = str(event.get("Date", "")).strip()
            parsed_dt = parse_datetime(raw_date_str)
            if not parsed_dt: continue
            
            std_date_str = parsed_dt.strftime("%Y-%m-%d")
            
            parts = str(event.get("Participants", ""))
            participants = normalize_list_field(parts) if parts else users_df["Name"].dropna().unique().tolist()
            
            if std_date_str not in active_dates:
                active_dates[std_date_str] = set()
                hotel_required_dates[std_date_str] = False
                
            active_dates[std_date_str].update(participants)
            
            # Check if this specific calendar event requires a hotel
            if str(event.get("Is Hotel", "")).strip().upper() == "TRUE":
                hotel_required_dates[std_date_str] = True
                
    future_dates = {d: list(p) for d, p in active_dates.items() if d >= today_str}
    
    if not future_dates:
        st.info("No upcoming events found in the Calendar. Add dates to see daily readiness checklists!")
    else:
        if not rides_df.empty:
            rides_df["Parsed Time"] = rides_df["Departure Time"].apply(parse_datetime)
            rides_df["Date String"] = rides_df["Parsed Time"].dt.strftime("%Y-%m-%d")
        if not meals_df.empty:
            meals_df["Parsed Time"] = meals_df["Time"].apply(parse_datetime)
            meals_df["Date String"] = meals_df["Parsed Time"].dt.strftime("%Y-%m-%d")

        for date_str in sorted(future_dates.keys()):
            participants_on_day = future_dates[date_str]
            nice_date_format = datetime.strptime(date_str, "%Y-%m-%d").strftime("%A, %B %d")
            
            date_rides = rides_df[rides_df["Date String"] == date_str] if not rides_df.empty else pd.DataFrame()
            date_meals = meals_df[meals_df["Date String"] == date_str] if not meals_df.empty else pd.DataFrame()
            
            mia_list = []
            
            for user in participants_on_day:
                missing = []
                
                # FIX: Only check the hotel room if today's calendar events require one!
                if hotel_required_dates.get(date_str, False):
                    user_row = users_df[users_df["Name"] == user]
                    if not user_row.empty and not str(user_row.iloc[0].get("Hotel Room", "")).strip():
                        missing.append("Hotel Room")
                
                # Check Transport (Car OR Public Transport)
                inbound = date_rides[date_rides["Direction"].str.lower() == "inbound"]
                has_inbound = False
                for _, r in inbound.iterrows():
                    if user == r["Driver"] or user in normalize_list_field(r.get("Passengers", "")):
                        has_inbound = True; break
                if not has_inbound: missing.append("Inbound Travel")
                
                outbound = date_rides[date_rides["Direction"].str.lower() == "outbound"]
                has_outbound = False
                for _, r in outbound.iterrows():
                    if user == r["Driver"] or user in normalize_list_field(r.get("Passengers", "")):
                        has_outbound = True; break
                if not has_outbound: missing.append("Outbound Travel")
                
                # Check Meals on this specific day
                for _, m in date_meals.iterrows():
                    if user not in normalize_list_field(m.get("RSVPs", "")):
                        missing.append(f"RSVP: {m['Meal Name']}")
                        
                if missing:
                    mia_list.append({"Name": user, "Missing": " + ".join(missing)})
                    
            is_today = (date_str == today_str)
            with st.expander(f"📅 Status for {nice_date_format}", expanded=is_today):
                if not mia_list:
                    st.success("Everyone is fully accounted for on this day! 🎉")
                else:
                    for m in mia_list:
                        st.error(f"**{m['Name']}** is missing: {m['Missing']}")

    st.divider()

    # --- MAP & LOCATIONS ---
    st.markdown("#### 📍 Group Locations")
    
    with st.expander("📍 Update My Location"):
        with st.form("location_ping_form"):
            ping_name = st.selectbox("Who are you?", options=sorted(users_df["Name"].dropna().unique()))
            ping_zone = st.selectbox("Zone", options=list(MAP_ZONES.keys()))
            ping_text = st.text_input("Specific Spot", placeholder="e.g. Artist Alley row D")
            if st.form_submit_button("Send Update"):
                if ping_text.strip():
                    update_user_location(ping_name, ping_zone, ping_text.strip())
                    st.rerun()

    if not users_df.empty:
        pings = users_df[["Name", "Live Location Ping"]].dropna()
        pings = pings[pings["Live Location Ping"] != ""]
        
        if pings.empty:
            st.info("No location updates yet.")
        else:
            map_data = []
            feed_html = ""
            
            for _, row in pings.iterrows():
                ping_str = str(row['Live Location Ping'])
                if "|" in ping_str:
                    zone, rest_of_ping = ping_str.split("|", 1)
                    zone, rest_of_ping = zone.strip(), rest_of_ping.strip()
                else:
                    zone = list(MAP_ZONES.keys())[0] 
                    rest_of_ping = ping_str
                
                text_part = rest_of_ping.split(" (at ")[0] if " (at " in rest_of_ping else rest_of_ping
                time_part = rest_of_ping.split(" (at ")[1].replace(")", "") if " (at " in rest_of_ping else "Unknown time"
                
                feed_html += f"""
                <div class='feed-card'>
                    <div class='ping-time'>{row['Name']} • {time_part}</div>
                    <div class='zone-badge'>{zone}</div>
                    <div class='ping-text'>{text_part}</div>
                </div>
                """
                if zone in MAP_ZONES:
                    base_lat, base_lon = MAP_ZONES[zone]
                    map_data.append({"lat": base_lat + random.uniform(-0.001, 0.001), "lon": base_lon + random.uniform(-0.001, 0.001), "name": row['Name']})

            if map_data:
                st.map(pd.DataFrame(map_data), zoom=12, use_container_width=True)
            st.markdown(feed_html, unsafe_allow_html=True)

    st.divider()

    st.markdown("#### 🛏️ Hotel Rooms")
    if users_df.empty: st.info("No hotel room assignments found.")
    else:
        room_grid = users_df.fillna("").groupby("Hotel Room")["Name"].apply(lambda names: ", ".join(names[names != ""])).reset_index(name="Guests")
        for _, row in room_grid.sort_values("Hotel Room").iterrows():
            st.markdown(f"**Room {row['Hotel Room'] or 'Unassigned'}:** {row['Guests']}")


# --- TRANSPORT TAB ---
def render_transport_tab(users_df: pd.DataFrame, rides_df: pd.DataFrame) -> None:
    st.markdown("## 🚗 Transport")

    now = get_local_now()
    default_tab_index = 0 if now.hour < 13 else 1

    direction_choice = st.radio("Route View", options=["Inbound to Con", "Outbound/Return"], index=default_tab_index, horizontal=True)
    direction_value = "Inbound" if direction_choice == "Inbound to Con" else "Outbound"
    
    if not rides_df.empty: rides_df["Direction"] = rides_df["Direction"].astype(str).str.strip().str.title()
    filtered_rides = rides_df[rides_df["Direction"] == direction_value].copy()

    def seats_left(row: pd.Series) -> int:
        passengers = normalize_list_field(row["Passengers"])
        return max(int(row["Total Seats"] or 0) - len(passengers), 0)

    if not filtered_rides.empty:
        filtered_rides["Parsed Time"] = filtered_rides["Departure Time"].apply(parse_datetime)
        filtered_rides["Seats Left"] = filtered_rides.apply(seats_left, axis=1)
        filtered_rides = filtered_rides[filtered_rides["Parsed Time"] >= now - timedelta(hours=2)]
        filtered_rides = filtered_rides.sort_values("Parsed Time").fillna("")

    if filtered_rides.empty and not rides_df[rides_df["Direction"] == direction_value].empty:
        st.success(f"All scheduled {direction_value.lower()} transport has departed!")
    elif filtered_rides.empty:
        st.info(f"No {direction_value.lower()} transport currently listed.")
    else:
        for _, ride in filtered_rides.iterrows():
            parsed_time = ride["Parsed Time"]
            minutes_left = (parsed_time - now).total_seconds() / 60.0
            
            is_pt = str(ride.get("Vehicle Type", "")).strip().lower() == "public transport"
            
            border_color = "#3b82f6" if is_pt else "#1f2937" 
            title_icon = "🚆" if is_pt else "🚗"
            title_text = f"Public Transport via {ride['Driver']}" if is_pt else f"{ride['Driver']}'s Car"
            
            time_warning = ""
            card_opacity = "1.0"
            is_full = (not is_pt) and (ride['Seats Left'] <= 0)
            
            full_badge = ""
            if is_full and minutes_left >= 0:
                full_badge = "<span style='background-color: #ef4444; color: white; font-size: 0.75rem; padding: 0.1rem 0.5rem; border-radius: 999px; margin-left: 0.5rem;'>FULL</span>"
                border_color = "#ef4444" 
                card_opacity = "0.6"     
            
            if minutes_left < 0:
                border_color = "#374151"
                time_warning = f"<span style='color:#6b7280; font-style:italic;'> (Departed)</span>"
                card_opacity = "0.5"
                full_badge = "" 
            elif 0 <= minutes_left <= 60 and not is_full:
                ratio = minutes_left / 60.0 
                r = int(239 - (239 - 59) * ratio) if not is_pt else 59  
                g = int(68 + (197 - 130) * ratio) if not is_pt else 130
                b = int(68 + (94 - 246) * ratio) if not is_pt else 246
                border_color = f"rgb({r}, {g}, {b})"
                time_warning = f"<span style='color:{border_color}; font-weight:bold;'> ({int(minutes_left)} mins left!)</span>"

            seat_display = "Ticket/Self-Arranged" if is_pt else f"{ride['Seats Left']} / {ride['Total Seats']}"
            origin_display = ride.get("Start Location", "Unknown Origin")

            st.markdown(f"""
            <div style='border-left: 6px solid {border_color}; background-color: #111827; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; opacity: {card_opacity};'>
                <h3 style='margin-top:0; margin-bottom: 0.2rem;'>{title_icon} {title_text} {full_badge}</h3>
                <p style='margin: 0.2rem 0;'><b>Departing:</b> {origin_display} at {ride['Departure Time']} {time_warning}</p>
                <p style='margin: 0.2rem 0;'><b>Seats Left:</b> {seat_display}</p>
                <p style='margin: 0.2rem 0; color: #9ca3af;'><b>Passengers:</b> {ride['Passengers'] or 'None'}</p>
            </div>
            """, unsafe_allow_html=True)

    st.divider()

    with st.expander("🎟️ Claim a Seat / Mark as Public Transport"):
        active_rides = filtered_rides[filtered_rides["Parsed Time"] >= now] if not filtered_rides.empty else filtered_rides
        if active_rides.empty:
            st.warning("No transport available right now.")
        else:
            ride_options = []
            ride_map: Dict[str, dict] = {}
            for _, ride in active_rides.iterrows():
                is_pt = str(ride.get("Vehicle Type", "")).strip().lower() == "public transport"
                
                if not is_pt and ride['Seats Left'] <= 0:
                    option_label = f"🚫 [FULL] {ride['Driver']} | {ride['Departure Time']}"
                elif is_pt:
                    option_label = f"🚆 [PT] {ride['Start Location']} via {ride['Driver']} | {ride['Departure Time']}"
                else:
                    option_label = f"✅ [CAR] {ride['Driver']} | {ride['Departure Time']} | {ride['Seats Left']} seats"
                    
                ride_options.append(option_label)
                ride_map[option_label] = ride.to_dict()

            with st.form("claim_seat_form"):
                claimer_name = st.selectbox("Your name", options=sorted(users_df["Name"].dropna().unique()))
                selected_ride_label = st.selectbox("Choose transport", options=ride_options)
                if st.form_submit_button("Confirm Travel Plan"):
                    selected_ride = ride_map[selected_ride_label]
                    claim_ride_seat(claimer_name, selected_ride, direction_value)
                    st.rerun()

    with st.expander("➕ Add Transport (Car or Train)"):
        with st.form("new_ride_form"):
            ride_direction = st.selectbox("Direction", options=["Inbound", "Outbound"], index=0 if direction_value == "Inbound" else 1)
            vehicle_type = st.selectbox("Transport Type", options=["Car", "Public Transport"])
            
            st.caption("If Public Transport, 'Driver' can be the line name (e.g. 'NS Intercity'). Seats will be ignored.")
            driver_name = st.text_input("Driver / Transit Line", placeholder="e.g. Gavin OR ICE International")
            start_loc = st.text_input("Starting Location", placeholder="e.g. Hotel Lobby OR Amsterdam Centraal")
            
            departure_date = st.date_input("Date")
            departure_time_input = st.time_input("Time")
            total_seats = st.number_input("Total seats (Ignored for PT)", min_value=1, max_value=50, value=4)
            
            if st.form_submit_button("Add Transport"):
                if not driver_name.strip() or not start_loc.strip():
                    st.error("Please fill in Driver/Line and Start Location.")
                else:
                    datetime_str = f"{departure_date.strftime('%Y-%m-%d')} {departure_time_input.strftime('%H:%M')}"
                    create_ride(ride_direction, vehicle_type, driver_name.strip(), datetime_str, start_loc.strip(), total_seats)
                    st.rerun()


# --- FOOD TAB ---
def render_food_tab(users_df: pd.DataFrame, meals_df: pd.DataFrame) -> None:
    st.markdown("## 🍔 Food & Events")
    display_meals = meals_df.copy()
    now = get_local_now()
    if not meals_df.empty:
        display_meals["Parsed Time"] = display_meals["Time"].apply(parse_datetime)
        display_meals = display_meals[display_meals["Parsed Time"] >= now - timedelta(hours=2)]
        display_meals = display_meals.sort_values(["Parsed Time", "Meal Name"]).fillna("")

    if display_meals.empty and not meals_df.empty: st.success("All scheduled events have concluded!")
    elif display_meals.empty: st.info("No meals planned yet.")
    else:
        for _, meal in display_meals.iterrows():
            minutes_left = (meal["Parsed Time"] - now).total_seconds() / 60.0
            border_color, card_opacity = "#1f2937", "1.0"
            time_warning = ""
            if minutes_left < 0:
                border_color, card_opacity, time_warning = "#374151", "0.5", f"<span style='color:#6b7280; font-style:italic;'> (Finished)</span>"
            elif 0 <= minutes_left <= 60:
                r = int(239 - (239 - 34) * (minutes_left / 60.0))
                g = int(68 + (197 - 68) * (minutes_left / 60.0))
                b = int(68 + (94 - 68) * (minutes_left / 60.0))
                border_color = f"rgb({r}, {g}, {b})"
                time_warning = f"<span style='color:{border_color}; font-weight:bold;'> ({int(minutes_left)} mins left!)</span>"

            st.markdown(f"""
            <div style='border-left: 6px solid {border_color}; background-color: #111827; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; opacity: {card_opacity};'>
                <h3 style='margin-top:0;'>{meal['Meal Name']}</h3>
                <p style='margin: 0.2rem 0;'><b>Time:</b> {meal['Time']} {time_warning}</p>
                <p style='margin: 0.2rem 0;'><b>Location:</b> {meal['Location (Optional)'] or 'TBD'}</p>
                <p style='margin: 0.2rem 0;'><b>Est. Cost:</b> {meal['Cost']}</p>
                <p style='margin: 0.2rem 0; color: #9ca3af;'><b>RSVPs:</b> {meal['RSVPs'] or 'None yet'}</p>
            </div>
            """, unsafe_allow_html=True)
    st.divider()
    with st.expander("🍽️ RSVP for a Meal"):
        active_meals = display_meals[display_meals["Parsed Time"] >= now] if not display_meals.empty else display_meals
        if active_meals.empty: st.warning("No upcoming meals.")
        else:
            meal_options = [f"{row['Meal Name']} — {row['Time']}" for _, row in active_meals.iterrows()]
            meal_map = {label: row.to_dict() for label, (_, row) in zip(meal_options, active_meals.iterrows())}
            with st.form("meal_rsvp_form"):
                rsvp_name = st.selectbox("Your name", options=sorted(users_df["Name"].dropna().unique()))
                selected_meal_label = st.selectbox("Select meal", options=meal_options)
                if st.form_submit_button("Confirm RSVP"):
                    rsvp_meal(rsvp_name, meal_map[selected_meal_label])
                    st.rerun()

    with st.expander("➕ Create New Meal Plan"):
        with st.form("create_meal_form"):
            meal_name = st.text_input("Meal name", placeholder="e.g. Japanese BBQ")
            meal_date = st.date_input("Date")
            meal_time = st.time_input("Time")
            meal_location = st.text_input("Location", placeholder="e.g. Hall B Food Court")
            meal_cost = st.text_input("Estimated cost", placeholder="e.g. €25")
            if st.form_submit_button("Add Meal"):
                if not meal_name.strip(): st.error("Meal name required.")
                else:
                    create_meal(meal_name.strip(), f"{meal_date.strftime('%Y-%m-%d')} {meal_time.strftime('%H:%M')}", meal_location.strip(), meal_cost.strip())
                    st.rerun()


# --- FINANCE TAB ---
def render_admin_tab(payments_df: pd.DataFrame, users_df: pd.DataFrame) -> None:
    st.markdown("## 💳 Finance")
    with st.expander("💸 Log a New Payment"):
        with st.form("payment_form"):
            payer = st.selectbox("Who paid?", options=sorted(users_df["Name"].dropna().unique()))
            amount = st.text_input("Amount", placeholder="e.g. 45.00")
            description = st.text_input("Description", placeholder="e.g. Parking pass")
            date_text = st.date_input("Date", value=get_local_now().date()).strftime("%Y-%m-%d")
            if st.form_submit_button("Save Payment"):
                if not amount.strip() or not description.strip(): st.error("Amount and description required.")
                else:
                    log_payment(payer, amount.strip(), description.strip(), date_text)
                    st.rerun()
    st.markdown("#### Transaction History")
    if payments_df.empty: st.info("No payments logged yet.")
    else:
        display_df = payments_df.copy()
        display_df["Date Parsed"] = display_df["Date"].apply(parse_datetime)
        for _, row in display_df.sort_values("Date Parsed", ascending=False).iterrows():
            st.markdown(f"""
            <div class='feed-card'><div style='display: flex; justify-content: space-between; align-items: center;'>
                <div><div class='ping-text'><b>{row['Paid By']}</b> paid for {row['Description']}</div><div class='ping-time'>{row['Date']}</div></div>
                <div style='font-size: 1.2rem; font-weight: bold; color: #10b981;'>€{row['Amount']}</div>
            </div></div>
            """, unsafe_allow_html=True)


# --- ARCHIVE & MORE MENU ---
def render_archive_tab(rides_df: pd.DataFrame, meals_df: pd.DataFrame) -> None:
    st.markdown("## 📜 The Archive")
    now = get_local_now()
    past_rides = pd.DataFrame()
    if not rides_df.empty:
        rides = rides_df.copy()
        rides["Parsed Time"] = rides["Departure Time"].apply(parse_datetime)
        past_rides = rides[rides["Parsed Time"] < now].copy()
        if not past_rides.empty:
            past_rides["Type"], past_rides["Display Name"] = "🚗 Transport", past_rides["Driver"].apply(lambda d: f"Travel with {d}")
            past_rides["Details"] = past_rides.apply(lambda r: f"{r['Direction']} from {r.get('Start Location', 'Unknown')} | Pax: {r['Passengers'] or 'None'}", axis=1)

    past_meals = pd.DataFrame()
    if not meals_df.empty:
        meals = meals_df.copy()
        meals["Parsed Time"] = meals["Time"].apply(parse_datetime)
        past_meals = meals[meals["Parsed Time"] < now].copy()
        if not past_meals.empty:
            past_meals["Type"], past_meals["Display Name"] = "🍔 Meal", past_meals["Meal Name"]
            past_meals["Details"] = past_meals.apply(lambda m: f"Location: {m['Location (Optional)'] or 'TBD'} | Cost: {m['Cost']}", axis=1)

    timeline = pd.concat([past_rides, past_meals], ignore_index=True)
    if timeline.empty: st.info("Archive empty."); return
    timeline = timeline.sort_values("Parsed Time", ascending=False)
    timeline["Date String"] = timeline["Parsed Time"].dt.strftime("%A, %B %d, %Y")
    for date_str, group in timeline.groupby("Date String", sort=False):
        with st.expander(f"📅 {date_str}"):
            for _, item in group.iterrows():
                st.markdown(f"**{item['Parsed Time'].strftime('%H:%M')}** — {item['Type']}: **{item['Display Name']}**")
                st.caption(f"{item['Details']}")
                st.divider()


def render_calendar_tab(calendar_df: pd.DataFrame) -> None:
    if calendar_df.empty: st.info("No events added to the Calendar tab yet."); return
    df = calendar_df.copy()
    
    # Added dayfirst=True to the calendar date parser
    df["Start Parsed"] = pd.to_datetime(df["Date"], errors="coerce", dayfirst=True)
    df = df.dropna(subset=["Start Parsed"]).sort_values("Start Parsed", ascending=True)
    
    for month_str, group in df.groupby(df["Start Parsed"].dt.strftime("%B %Y"), sort=False):
        st.markdown(f"#### 📆 {month_str}")
        for _, event in group.iterrows():
            is_hotel = str(event.get("Is Hotel", "")).strip().upper() == "TRUE"
            bg_color, icon, ev_type = ("#10b981", "🏨", "HOTEL") if is_hotel else ("#3b82f6", "🎟️", "EVENT")
            
            st.markdown(f"""
            <div class='feed-card' style='border-left: 5px solid {bg_color};'>
                <div class='calendar-badge' style='background-color: {bg_color}; color: white;'>{icon} {ev_type}</div>
                <h4 style='margin: 0 0 0.2rem 0;'>{event['Event Name']}</h4>
                <p style='margin: 0.2rem 0; font-size: 0.85rem; color: #9ca3af;'><b>Date:</b> {event['Date']}</p>
                <p style='margin: 0.4rem 0 0 0; font-size: 0.9rem;'><b>Going:</b> {event.get('Participants', 'None Listed')}</p>
            </div>
            """, unsafe_allow_html=True)

def render_more_menu(rides_df: pd.DataFrame, meals_df: pd.DataFrame, calendar_df: pd.DataFrame) -> None:
    st.markdown("## ☰ Options & Tools")
    selected_sub = option_menu(None, ["Con Calendar", "Archive History"], icons=["calendar-event", "clock-history"], default_index=0, orientation="horizontal", styles={"container": {"padding": "0!important", "background-color": "#0b1320"}, "icon": {"color": "#a78bfa", "font-size": "14px"}, "nav-link": {"font-size": "11px", "padding": "8px 0px", "background-color": "#111827", "color": "#9ca3af"}, "nav-link-selected": {"background-color": "#1f2937", "color": "#f8fafc"}})
    st.markdown("<br>", unsafe_allow_html=True)
    if selected_sub == "Con Calendar": render_calendar_tab(calendar_df)
    elif selected_sub == "Archive History": render_archive_tab(rides_df, meals_df)
    st.divider()
    external_url = st.secrets.get("google_sheets", {}).get("external_sheet_url")
    if external_url: st.link_button("📂 Open Master Google Sheet", external_url, use_container_width=True)


def check_password() -> bool:
    if st.session_state.get("password_correct", False): return True
    st.markdown("## 🛑 Authorized Access Only\nPlease enter the private group passphrase.")
    with st.form("login_form"):
        pwd = st.text_input("Passphrase", type="password")
        if st.form_submit_button("Enter"):
            if pwd == st.secrets.get("app_password", "default_secret_if_forgotten"):
                st.session_state["password_correct"] = True
                st.rerun()
            else: st.error("Incorrect passphrase.")
    return False


def main() -> None:
    if not check_password(): return
    st_autorefresh(interval=60000, limit=None, key="con_refresh")

    st.markdown("<h2 style='text-align: center; margin-bottom: 0;'>🛡️ Ankerd Con</h2>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: #9ca3af; margin-bottom: 1rem;'>Live Event Logistics</p>", unsafe_allow_html=True)

    selected_tab = option_menu(
        None, ["Hub", "Travel", "Food", "Money", "More ☰"], icons=["house", "car-front", "cup-hot", "wallet2", "list"],
        menu_icon="cast", default_index=0, orientation="horizontal",
        styles={"container": {"padding": "0!important", "background-color": "#0b1320"}, "icon": {"color": "#7c3aed", "font-size": "15px"}, "nav-link": {"font-size": "11px", "margin": "0px 1px", "padding": "10px 0px", "border-radius": "10px", "color": "#d1d5db", "background-color": "#111827"}, "nav-link-selected": {"background-color": "#1f2937", "color": "#f8fafc", "font-weight": "bold"}}
    )

    tables = get_all_tables()
    users_df = tables.get("Users", pd.DataFrame())
    rides_df = tables.get("Rides", pd.DataFrame())
    meals_df = tables.get("Meals", pd.DataFrame())
    payments_df = tables.get("Payments", pd.DataFrame())
    calendar_df = tables.get("Calendar", pd.DataFrame())

    if selected_tab == "Hub": render_hub_tab(users_df, rides_df, meals_df, calendar_df)
    elif selected_tab == "Travel": render_transport_tab(users_df, rides_df)
    elif selected_tab == "Food": render_food_tab(users_df, meals_df)
    elif selected_tab == "Money": render_admin_tab(payments_df, users_df)
    elif selected_tab == "More ☰": render_more_menu(rides_df, meals_df, calendar_df)


if __name__ == "__main__":
    main()