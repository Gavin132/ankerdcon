import json
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


# UI UPGRADE: Changed layout to centered for a forced mobile-app feel on all devices
st.set_page_config(page_title="Ankerd Con App", layout="centered", page_icon="🛡️", initial_sidebar_state="collapsed")

# Mobile-first dark theme styling
st.markdown(
    """
    <style>
    :root { color-scheme: dark; }
    body, .stApp, .css-1d391kg { background-color: #0b1320; color: #e6e8ef; }
    
    /* UI UPGRADE: Tightened padding so the app doesn't waste space at the top of a phone screen */
    .block-container { padding: 2rem 1rem 2rem 1rem !important; max-width: 600px; }
    
    .stButton>button, .stDownloadButton>button { background-color: #7c3aed; color: #ffffff; border-radius: 0.8rem; border: none; font-weight: bold; }
    .stButton>button:hover { background-color: #6d28d9; }
    
    .stTextInput>div>div>input, .stSelectbox>div>div>div>input, .stNumberInput>div>div>input { background-color: #111827; color: #e6e8ef; border-radius: 0.8rem; border: 1px solid #374151; }
    
    /* UI UPGRADE: Make expanders look like interactive menu buttons */
    .streamlit-expanderHeader { background-color: #1f2937; border-radius: 0.5rem; color: #e6e8ef; font-weight: bold; }
    div[data-testid="stExpander"] { border: none !important; margin-bottom: 1rem; }
    
    .stMarkdown { color: #e6e8ef; }
    .stApp .css-1d391kg .main { background-color: #0b1320; }
    
    /* Custom Card Classes for Feed Layouts */
    .feed-card { background-color: #111827; padding: 1rem; border-radius: 0.8rem; border: 1px solid #1f2937; margin-bottom: 0.8rem; }
    .ping-time { color: #9ca3af; font-size: 0.8rem; margin-bottom: 0.2rem; }
    .ping-text { font-size: 1rem; margin-top: 0; }
    </style>
    """,
    unsafe_allow_html=True,
)


USER_COLS = {
    "Name": 1,
    "Phone Number": 2,
    "Hotel Room": 3,
    "Live Location Ping": 4,
    "Inbound Car": 5,
    "Outbound Car": 6,
}
RIDES_COLS = {
    "Direction": 1,
    "Driver": 2,
    "Departure Time": 3,
    "Total Seats": 4,
    "Passengers": 5,
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


def get_local_now() -> datetime:
    return pd.Timestamp.now(tz="Europe/Amsterdam").tz_localize(None).to_pydatetime()


def send_discord_notification(title: str, message: str) -> None:
    webhook_url = st.secrets.get("webhooks", {}).get("discord")
    if not webhook_url:
        return

    payload = {
        "username": "Ankerd Con Bot",
        "embeds": [
            {
                "title": title,
                "description": message,
                "color": 0x5b6f9f,
                "timestamp": get_local_now().isoformat(),
            }
        ],
    }

    try:
        requests.post(webhook_url, json=payload, timeout=5)
    except requests.RequestException:
        pass


@st.cache_resource
def get_gsheet_client() -> gspread.Client:
    credentials_info = st.secrets.get("google_service_account")
    if not credentials_info:
        raise RuntimeError("Missing Google service account credentials in st.secrets.")

    credentials = Credentials.from_service_account_info(
        credentials_info,
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    return gspread.authorize(credentials)


@st.cache_resource
def get_gsheet() -> gspread.Spreadsheet:
    sheet_id = st.secrets.get("google_sheets", {}).get("sheet_id")
    if not sheet_id:
        raise RuntimeError("Missing google_sheets.sheet_id in st.secrets.")

    client = get_gsheet_client()
    return client.open_by_key(sheet_id)


@st.cache_data(ttl=60)
def get_sheet_records(tab_name: str) -> pd.DataFrame:
    worksheet = get_gsheet().worksheet(tab_name)
    records = worksheet.get_all_records()
    
    if not records:
        headers = worksheet.row_values(1)
        return pd.DataFrame(columns=headers)

    df = pd.DataFrame(records)
    df = df.astype(str).replace("nan", "", regex=False)
    df["row_number"] = df.index + 2
    return df


def update_sheet_cell(tab_name: str, row_number: int, col_number: int, value: str) -> None:
    worksheet = get_gsheet().worksheet(tab_name)
    worksheet.update_cell(row_number, col_number, value)


def append_sheet_row(tab_name: str, values: List[str]) -> None:
    worksheet = get_gsheet().worksheet(tab_name)
    worksheet.append_row(values, value_input_option="USER_ENTERED")


def parse_datetime(value: str) -> Optional[datetime]:
    try:
        parsed = pd.to_datetime(value, errors="coerce")
        if pd.isna(parsed):
            return None
        return parsed.to_pydatetime()
    except Exception:
        return None


def normalize_list_field(value: str) -> List[str]:
    return [item.strip() for item in str(value).split(",") if item.strip()]


def get_next_meal(meals_df: pd.DataFrame) -> Optional[pd.Series]:
    if meals_df.empty:
        return None

    meals_df = meals_df.copy()
    meals_df["_parsed_time"] = meals_df["Time"].apply(parse_datetime)
    now = get_local_now()
    
    upcoming = meals_df[meals_df["_parsed_time"] >= now]
    if upcoming.empty:
        return None
        
    upcoming = upcoming.sort_values(["_parsed_time", "Meal Name"], ascending=True)
    return upcoming.iloc[0]


def update_user_location(user_name: str, location_text: str) -> None:
    users_df = get_sheet_records("Users")
    user = users_df[users_df["Name"] == user_name]
    if user.empty:
        st.error("Name not found in the Users sheet.")
        return

    row_number = int(user.iloc[0]["row_number"])
    
    current_time = get_local_now().strftime("%H:%M")
    ping_with_time = f"{location_text} (at {current_time})"
    
    update_sheet_cell("Users", row_number, USER_COLS["Live Location Ping"], ping_with_time)
    get_sheet_records.clear()
    send_discord_notification(
        "Location Ping Updated",
        f"{user_name} updated their live location to: {ping_with_time}",
    )
    st.success(f"Ping updated to: {location_text}")


def update_user_car(user_name: str, direction: str, car_label: str) -> None:
    users_df = get_sheet_records("Users")
    user = users_df[users_df["Name"] == user_name]
    if user.empty:
        return

    row_number = int(user.iloc[0]["row_number"])
    col_name = "Inbound Car" if direction == "Inbound" else "Outbound Car"
    update_sheet_cell("Users", row_number, USER_COLS[col_name], car_label)
    get_sheet_records.clear()


def claim_ride_seat(user_name: str, ride_row: Dict[str, str], direction: str) -> None:
    current_passengers = normalize_list_field(ride_row.get("Passengers", ""))
    if user_name in current_passengers:
        st.warning("You are already listed as a passenger for this ride.")
        return

    seats_left = max(int(ride_row.get("Total Seats", 0)) - len(current_passengers), 0)
    if seats_left <= 0:
        st.error("This ride has no seats left.")
        return

    current_passengers.append(user_name)
    passenger_text = ", ".join(current_passengers)
    update_sheet_cell(
        "Rides",
        int(ride_row["row_number"]),
        RIDES_COLS["Passengers"],
        passenger_text,
    )
    update_user_car(user_name, direction, f"{ride_row['Driver']} @ {ride_row['Departure Time']}")
    get_sheet_records.clear()
    st.success(f"Seat claimed with {ride_row['Driver']}!")


def create_ride(direction: str, driver: str, departure_time: str, total_seats: int) -> None:
    append_sheet_row("Rides", [direction, driver, departure_time, str(total_seats), ""])
    get_sheet_records.clear()
    send_discord_notification(
        "New Ride Created",
        f"{driver} created an {direction} ride departing at {departure_time} with {total_seats} total seats.",
    )
    st.success("New ride added.")


def create_meal(meal_name: str, meal_time: str, location: str, cost: str) -> None:
    append_sheet_row("Meals", [meal_name, meal_time, location, cost, ""])
    get_sheet_records.clear()
    send_discord_notification(
        "New Meal Added",
        f"A new meal plan was created: {meal_name} at {meal_time} ({location}) for {cost}.",
    )
    st.success("Meal plan created.")


def rsvp_meal(user_name: str, meal_row: Dict[str, str]) -> None:
    current_rsvps = normalize_list_field(meal_row.get("RSVPs", ""))
    if user_name in current_rsvps:
        st.warning("You have already RSVP'd to this meal.")
        return

    current_rsvps.append(user_name)
    update_sheet_cell(
        "Meals",
        int(meal_row["row_number"]),
        MEALS_COLS["RSVPs"],
        ", ".join(current_rsvps),
    )
    get_sheet_records.clear()
    st.success(f"RSVP recorded for {meal_row['Meal Name']}.")


def log_payment(paid_by: str, amount: str, description: str, date_text: str) -> None:
    append_sheet_row("Payments", [paid_by, amount, description, date_text])
    get_sheet_records.clear()
    st.success("Payment logged.")


def render_hub_tab(users_df: pd.DataFrame, meals_df: pd.DataFrame) -> None:
    st.markdown("## 🗺️ The Hub")
    
    # --- M.I.A. LIST ---
    st.markdown("#### 🚨 Action Needed")
    next_meal = get_next_meal(meals_df)
    
    if not users_df.empty:
        display_users = users_df.copy()

        def get_missing_items(row: pd.Series) -> str:
            missing = []
            if not str(row.get("Hotel Room", "")).strip(): missing.append("Hotel")
            if not str(row.get("Inbound Car", "")).strip(): missing.append("Inbound Ride")
            if not str(row.get("Outbound Car", "")).strip(): missing.append("Outbound Ride")
            if next_meal is not None:
                meal_rsvps = normalize_list_field(next_meal.get("RSVPs", ""))
                if row["Name"] not in meal_rsvps: missing.append("Meal RSVP")
            return " + ".join(missing)

        display_users["Missing Action"] = display_users.apply(get_missing_items, axis=1)
        mia_df = display_users[display_users["Missing Action"] != ""]
        
        # UI UPGRADE: Replaced table with high-visibility alert blocks
        if mia_df.empty:
            st.success("Everyone is fully accounted for!")
        else:
            for _, row in mia_df.iterrows():
                st.error(f"**{row['Name']}** is missing: {row['Missing Action']}")
    
    st.divider()

    # --- LOCATION PINGS ---
    st.markdown("#### 📍 Live Locations")
    
    # UI UPGRADE: Hidden the form inside an expander
    with st.expander("📍 Update My Location"):
        with st.form("location_ping_form"):
            ping_name = st.selectbox("Who are you?", options=sorted(users_df["Name"].dropna().unique()))
            ping_text = st.text_input("Short update", placeholder="e.g. At Artist Alley row D")
            if st.form_submit_button("Send Update"):
                if ping_text.strip():
                    update_user_location(ping_name, ping_text.strip())
                    st.rerun()

    # UI UPGRADE: Replaced table with a social-media style feed
    if not users_df.empty:
        pings = users_df[["Name", "Live Location Ping"]].dropna()
        pings = pings[pings["Live Location Ping"] != ""]
        if pings.empty:
            st.info("No location updates yet.")
        else:
            for _, row in pings.iterrows():
                # Extracting the time from the string for styling (e.g., "At Artist Alley (at 14:30)")
                ping_str = str(row['Live Location Ping'])
                text_part = ping_str.split(" (at ")[0] if " (at " in ping_str else ping_str
                time_part = ping_str.split(" (at ")[1].replace(")", "") if " (at " in ping_str else "Unknown time"
                
                st.markdown(f"""
                <div class='feed-card'>
                    <div class='ping-time'>{row['Name']} • {time_part}</div>
                    <div class='ping-text'>{text_part}</div>
                </div>
                """, unsafe_allow_html=True)

    st.divider()

    # --- HOTEL ROOMS ---
    st.markdown("#### 🛏️ Hotel Rooms")
    # UI UPGRADE: Replaced dataframe with simple readable text blocks
    if users_df.empty:
        st.info("No hotel room assignments found.")
    else:
        room_grid = (
            users_df.fillna("").groupby("Hotel Room")["Name"]
            .apply(lambda names: ", ".join(names[names != ""])).reset_index(name="Guests")
        )
        for _, row in room_grid.sort_values("Hotel Room").iterrows():
            room_name = row['Hotel Room'] if row['Hotel Room'] else "Unassigned"
            st.markdown(f"**Room {room_name}:** {row['Guests']}")


def render_transport_tab(users_df: pd.DataFrame, rides_df: pd.DataFrame) -> None:
    st.markdown("## 🚗 Transport")

    now = get_local_now()
    default_tab_index = 0 if now.hour < 13 else 1

    direction_choice = st.radio("Route View", options=["Inbound to Con", "Outbound/Return"], index=default_tab_index, horizontal=True)
    direction_value = "Inbound" if direction_choice == "Inbound to Con" else "Outbound"
    
    if not rides_df.empty:
        rides_df["Direction"] = rides_df["Direction"].astype(str).str.strip().str.title()
        
    filtered_rides = rides_df[rides_df["Direction"] == direction_value].copy()

    def seats_left(row: pd.Series) -> int:
        passengers = normalize_list_field(row["Passengers"])
        return max(int(row["Total Seats"] or 0) - len(passengers), 0)

    if not filtered_rides.empty:
        filtered_rides["Parsed Time"] = filtered_rides["Departure Time"].apply(parse_datetime)
        filtered_rides["Seats Left"] = filtered_rides.apply(seats_left, axis=1)
        cutoff_time = now - timedelta(hours=2)
        filtered_rides = filtered_rides[filtered_rides["Parsed Time"] >= cutoff_time]
        filtered_rides = filtered_rides.sort_values("Parsed Time").fillna("")

    # --- RIDE FEED ---
    if filtered_rides.empty and not rides_df[rides_df["Direction"] == direction_value].empty:
        st.success(f"All scheduled {direction_value.lower()} rides have departed!")
    elif filtered_rides.empty:
        st.info(f"No {direction_value.lower()} rides are currently listed.")
    else:
        for _, ride in filtered_rides.iterrows():
            parsed_time = ride["Parsed Time"]
            minutes_left = (parsed_time - now).total_seconds() / 60.0
            
            border_color = "#1f2937"
            time_warning = ""
            card_opacity = "1.0"
            is_full = ride['Seats Left'] <= 0
            
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
                r = int(239 - (239 - 34) * ratio)
                g = int(68 + (197 - 68) * ratio)
                b = int(68 + (94 - 68) * ratio)
                border_color = f"rgb({r}, {g}, {b})"
                time_warning = f"<span style='color:{border_color}; font-weight:bold;'> ({int(minutes_left)} mins left!)</span>"
            elif 0 <= minutes_left <= 60 and is_full:
                 time_warning = f"<span style='color:#ef4444; font-weight:bold;'> ({int(minutes_left)} mins left!)</span>"

            st.markdown(f"""
            <div style='border-left: 6px solid {border_color}; background-color: #111827; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; opacity: {card_opacity};'>
                <h3 style='margin-top:0; margin-bottom: 0.2rem;'>{ride['Driver']}'s Car {full_badge}</h3>
                <p style='margin: 0.2rem 0;'><b>Departure:</b> {ride['Departure Time']} {time_warning}</p>
                <p style='margin: 0.2rem 0;'><b>Seats Left:</b> {ride['Seats Left']} / {ride['Total Seats']}</p>
                <p style='margin: 0.2rem 0; color: #9ca3af;'><b>Passengers:</b> {ride['Passengers'] or 'None'}</p>
            </div>
            """, unsafe_allow_html=True)

    st.divider()

    # UI UPGRADE: Hide action forms in expanders
    with st.expander("🎟️ Claim a Seat"):
        active_rides = filtered_rides[filtered_rides["Parsed Time"] >= now] if not filtered_rides.empty else filtered_rides
        if active_rides.empty:
            st.warning("No cars available right now.")
        else:
            ride_options = []
            ride_map: Dict[str, dict] = {}
            for _, ride in active_rides.iterrows():
                if ride['Seats Left'] <= 0:
                    option_label = f"🚫 [FULL] {ride['Driver']} | {ride['Departure Time']}"
                else:
                    option_label = f"✅ {ride['Driver']} | {ride['Departure Time']} | {ride['Seats Left']} seats"
                ride_options.append(option_label)
                ride_map[option_label] = ride.to_dict()

            with st.form("claim_seat_form"):
                claimer_name = st.selectbox("Your name", options=sorted(users_df["Name"].dropna().unique()))
                selected_ride_label = st.selectbox("Choose a car", options=ride_options)
                if st.form_submit_button("Confirm Seat"):
                    selected_ride = ride_map[selected_ride_label]
                    if selected_ride["Seats Left"] <= 0:
                        st.error("This ride is completely full!")
                    else:
                        claim_ride_seat(claimer_name, selected_ride, direction_value)
                        st.rerun()

    with st.expander("➕ Create a New Ride"):
        with st.form("new_ride_form"):
            form_default_index = 0 if direction_value == "Inbound" else 1
            ride_direction = st.selectbox("Direction", options=["Inbound", "Outbound"], index=form_default_index)
            driver_name = st.selectbox("Driver", options=sorted(users_df["Name"].dropna().unique()))
            
            # Mobile friendly stacking
            departure_date = st.date_input("Date")
            departure_time_input = st.time_input("Time")
            total_seats = st.number_input("Total passenger seats", min_value=1, max_value=20, value=4)
            
            if st.form_submit_button("Add Ride"):
                datetime_str = f"{departure_date.strftime('%Y-%m-%d')} {departure_time_input.strftime('%H:%M')}"
                create_ride(ride_direction, driver_name, datetime_str, total_seats)
                st.rerun()


def render_food_tab(users_df: pd.DataFrame, meals_df: pd.DataFrame) -> None:
    st.markdown("## 🍔 Food & Events")

    display_meals = meals_df.copy()
    now = get_local_now()
    
    if not meals_df.empty:
        display_meals["Parsed Time"] = display_meals["Time"].apply(parse_datetime)
        cutoff_time = now - timedelta(hours=2)
        display_meals = display_meals[display_meals["Parsed Time"] >= cutoff_time]
        display_meals = display_meals.sort_values(["Parsed Time", "Meal Name"]).fillna("")

    # --- MEAL FEED ---
    if display_meals.empty and not meals_df.empty:
        st.success("All scheduled events have concluded!")
    elif display_meals.empty:
        st.info("No meals planned yet.")
    else:
        for _, meal in display_meals.iterrows():
            parsed_time = meal["Parsed Time"]
            minutes_left = (parsed_time - now).total_seconds() / 60.0
            
            border_color = "#1f2937" 
            time_warning = ""
            card_opacity = "1.0"
            
            if minutes_left < 0:
                border_color = "#374151"
                time_warning = f"<span style='color:#6b7280; font-style:italic;'> (Finished)</span>"
                card_opacity = "0.5"
            elif 0 <= minutes_left <= 60:
                ratio = minutes_left / 60.0 
                r = int(239 - (239 - 34) * ratio)
                g = int(68 + (197 - 68) * ratio)
                b = int(68 + (94 - 68) * ratio)
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

    # UI UPGRADE: Hide action forms in expanders
    with st.expander("🍽️ RSVP for a Meal"):
        active_meals = display_meals[display_meals["Parsed Time"] >= now] if not display_meals.empty else display_meals
        if active_meals.empty:
            st.warning("No upcoming meals to RSVP for.")
        else:
            meal_options = [f"{row['Meal Name']} — {row['Time']}" for _, row in active_meals.iterrows()]
            meal_map = {label: row.to_dict() for label, (_, row) in zip(meal_options, active_meals.iterrows())}
            
            with st.form("meal_rsvp_form"):
                rsvp_name = st.selectbox("Your name", options=sorted(users_df["Name"].dropna().unique()))
                selected_meal_label = st.selectbox("Select meal", options=meal_options)
                if st.form_submit_button("Confirm RSVP"):
                    selected_meal = meal_map[selected_meal_label]
                    rsvp_meal(rsvp_name, selected_meal)
                    st.rerun()

    with st.expander("➕ Create New Meal Plan"):
        with st.form("create_meal_form"):
            meal_name = st.text_input("Meal name", placeholder="e.g. Japanese BBQ")
            meal_date = st.date_input("Date")
            meal_time = st.time_input("Time")
            meal_location = st.text_input("Location", placeholder="e.g. Hall B Food Court")
            meal_cost = st.text_input("Estimated cost", placeholder="e.g. €25")
            
            if st.form_submit_button("Add Meal"):
                if not meal_name.strip():
                    st.error("Meal name is required.")
                else:
                    datetime_str = f"{meal_date.strftime('%Y-%m-%d')} {meal_time.strftime('%H:%M')}"
                    create_meal(meal_name.strip(), datetime_str, meal_location.strip(), meal_cost.strip())
                    st.rerun()


def render_admin_tab(payments_df: pd.DataFrame, users_df: pd.DataFrame) -> None:
    st.markdown("## 💳 Finance")

    # UI UPGRADE: Hide action form in expander
    with st.expander("💸 Log a New Payment"):
        with st.form("payment_form"):
            payer = st.selectbox("Who paid?", options=sorted(users_df["Name"].dropna().unique()))
            amount = st.text_input("Amount", placeholder="e.g. 45.00")
            description = st.text_input("Description", placeholder="e.g. Parking pass")
            date_text = st.date_input("Date", value=get_local_now().date()).strftime("%Y-%m-%d")
            
            if st.form_submit_button("Save Payment"):
                if not amount.strip() or not description.strip():
                    st.error("Amount and description required.")
                else:
                    log_payment(payer, amount.strip(), description.strip(), date_text)
                    st.rerun()

    st.markdown("#### Transaction History")
    # UI UPGRADE: Replaced dataframe with a clean banking-style feed
    if payments_df.empty:
        st.info("No payments logged yet.")
    else:
        display_df = payments_df.copy()
        display_df["Date Parsed"] = display_df["Date"].apply(parse_datetime)
        display_df = display_df.sort_values("Date Parsed", ascending=False)
        
        for _, row in display_df.iterrows():
            st.markdown(f"""
            <div class='feed-card'>
                <div style='display: flex; justify-content: space-between; align-items: center;'>
                    <div>
                        <div class='ping-text'><b>{row['Paid By']}</b> paid for {row['Description']}</div>
                        <div class='ping-time'>{row['Date']}</div>
                    </div>
                    <div style='font-size: 1.2rem; font-weight: bold; color: #10b981;'>€{row['Amount']}</div>
                </div>
            </div>
            """, unsafe_allow_html=True)


def check_password() -> bool:
    if st.session_state.get("password_correct", False):
        return True

    st.markdown("## 🛑 Authorized Access Only")
    st.markdown("Please enter the private group passphrase to access the convention planner.")
    
    with st.form("login_form"):
        pwd = st.text_input("Passphrase", type="password")
        if st.form_submit_button("Enter"):
            # Ensure app_password is set in secrets.toml!
            if pwd == st.secrets.get("app_password", "default_secret_if_forgotten"):
                st.session_state["password_correct"] = True
                st.rerun()
            else:
                st.error("Incorrect passphrase.")
                
    return False


def main() -> None:
    if not check_password():
        return

    st_autorefresh(interval=60000, limit=None, key="con_refresh")

    # UI UPGRADE: Minimalist header
    st.markdown("<h2 style='text-align: center; margin-bottom: 0;'>🛡️ Ankerd Con</h2>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: #9ca3af; margin-bottom: 1rem;'>Live Event Logistics</p>", unsafe_allow_html=True)

    selected_tab = option_menu(
        None,
        ["Hub", "Cars", "Food", "Money"], # Shortened titles so they fit on one mobile row
        icons=["house", "car-front", "cup-hot", "wallet2"],
        menu_icon="cast",
        default_index=0,
        orientation="horizontal",
        styles={
            "container": {"padding": "0!important", "background-color": "#0b1320"},
            "icon": {"color": "#7c3aed", "font-size": "16px"},
            "nav-link": {
                "font-size": "12px", 
                "text-align": "center",
                "margin": "0px 2px",
                "padding": "10px 0px",
                "border-radius": "10px",
                "color": "#d1d5db",
                "background-color": "#111827",
            },
            "nav-link-selected": {"background-color": "#1f2937", "color": "#f8fafc", "font-weight": "bold"},
        },
    )

    users_df = get_sheet_records("Users")
    rides_df = get_sheet_records("Rides")
    meals_df = get_sheet_records("Meals")
    payments_df = get_sheet_records("Payments")

    if selected_tab == "Hub":
        render_hub_tab(users_df, meals_df)
    elif selected_tab == "Cars":
        render_transport_tab(users_df, rides_df)
    elif selected_tab == "Food":
        render_food_tab(users_df, meals_df)
    elif selected_tab == "Money":
        render_admin_tab(payments_df, users_df)


if __name__ == "__main__":
    main()