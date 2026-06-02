import json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Dict, List, Optional

import gspread
import pandas as pd
import requests
import streamlit as st
from streamlit_autorefresh import st_autorefresh
from google.oauth2.service_account import Credentials
from streamlit_option_menu import option_menu


st.set_page_config(page_title="Ankerd Con App", layout="wide", page_icon="🛡️")

# Mobile-first dark theme styling for a compact, readable layout.
st.markdown(
    """
    <style>
    :root { color-scheme: dark; }
    body, .stApp, .css-1d391kg { background-color: #0b1320; color: #e6e8ef; }
    .block-container { padding: 1rem 1rem 2rem 1rem; }
    .stButton>button, .stDownloadButton>button { background-color: #1f2937; color: #e6e8ef; border-radius: 0.8rem; }
    .stTextInput>div>div>input, .stSelectbox>div>div>div>input, .stNumberInput>div>div>input { background-color: #111827; color: #e6e8ef; border-radius: 0.8rem; }
    .stMarkdown, .stExpanderHeader { color: #e6e8ef; }
    .css-1aumxhk { padding-top: 0.2rem; }
    .stApp .css-1d391kg .main { background-color: #0b1320; }
    .card { background: #111827; border: 1px solid #1f2937; border-radius: 1rem; padding: 1rem; margin-bottom: 1rem; }
    </style>
    """,
    unsafe_allow_html=True,
)


# Column indexes according to the Google Sheet structure.
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
    """Gets the exact current time in Amsterdam, including DST, using Pandas to bypass missing Linux timezone files."""
    return pd.Timestamp.now(tz="Europe/Amsterdam").tz_localize(None).to_pydatetime()


def send_discord_notification(title: str, message: str) -> None:
    """Send a lightweight notification to the Discord webhook stored in secrets."""
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
        st.warning("Could not deliver Discord notification. Check your webhook secret.")


@st.cache_resource
def get_gsheet_client() -> gspread.Client:
    """Build a GSheets client from Streamlit secrets."""
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
    """Open the Google Sheet by sheet ID stored in secrets."""
    sheet_id = st.secrets.get("google_sheets", {}).get("sheet_id")
    if not sheet_id:
        raise RuntimeError("Missing google_sheets.sheet_id in st.secrets.")

    client = get_gsheet_client()
    return client.open_by_key(sheet_id)


@st.cache_data(ttl=60)
def get_sheet_records(tab_name: str) -> pd.DataFrame:
    """Load a worksheet and convert it to a pandas DataFrame."""
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
    """Try to interpret a string as a datetime for sorting."""
    try:
        parsed = pd.to_datetime(value, errors="coerce")
        if pd.isna(parsed):
            return None
        return parsed.to_pydatetime()
    except Exception:
        return None


def normalize_list_field(value: str) -> List[str]:
    return [item.strip() for item in str(value).split(",") if item.strip()]


def row_to_str(value: Optional[str]) -> str:
    return str(value or "").strip()


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


def refresh_cache() -> None:
    for func in [get_sheet_records]:
        func.clear()


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
    st.success("Location ping updated successfully.")


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
    st.success(f"{user_name} has claimed a seat on the ride driven by {ride_row['Driver']}.")


def create_ride(direction: str, driver: str, departure_time: str, total_seats: int) -> None:
    append_sheet_row("Rides", [direction, driver, departure_time, str(total_seats), ""])
    get_sheet_records.clear()
    send_discord_notification(
        "New Ride Created",
        f"{driver} created an {direction} ride departing at {departure_time} with {total_seats} total seats.",
    )
    st.success("New ride added to the transport plan.")


def create_meal(meal_name: str, meal_time: str, location: str, cost: str) -> None:
    append_sheet_row("Meals", [meal_name, meal_time, location, cost, ""])
    get_sheet_records.clear()
    send_discord_notification(
        "New Meal Added",
        f"A new meal plan was created: {meal_name} at {meal_time} ({location}) for {cost}.",
    )
    st.success("Meal plan created successfully.")


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
    st.success(f"{user_name} has RSVP'd to {meal_row['Meal Name']}.")


def log_payment(paid_by: str, amount: str, description: str, date_text: str) -> None:
    append_sheet_row("Payments", [paid_by, amount, description, date_text])
    get_sheet_records.clear()
    st.success("Payment logged successfully.")


def build_header() -> None:
    st.markdown("# 🛡️ Ankerd Con App")
    st.markdown(
        "Streamlined mobile planning for hotel rooms, transport, food, and finance during the convention."
    )


def render_hub_tab(users_df: pd.DataFrame, meals_df: pd.DataFrame) -> None:
    st.header("🗺️ The Hub")
    with st.container():
        st.subheader("Hotelkamer Indeling")
        if users_df.empty:
            st.info("No hotel room assignments found.")
        else:
            room_grid = (
                users_df.fillna("")
                .groupby("Hotel Room")
                ["Name"]
                .apply(lambda names: ", ".join(names[names != ""]))
                .reset_index(name="Guests")
            )
            room_grid.loc[room_grid["Hotel Room"] == "", "Hotel Room"] = "Unassigned"
            st.dataframe(room_grid.sort_values("Hotel Room"), use_container_width=True)

    with st.container():
        st.subheader("Location Ping")
        with st.form("location_ping_form"):
            ping_name = st.selectbox(
                "Select your name",
                options=sorted(users_df["Name"].dropna().unique()),
                help="Select your group name to update your live location.",
            )
            ping_text = st.text_input(
                "Short location update",
                placeholder="At Artist Alley",
                max_chars=80,
            )
            if st.form_submit_button("Send Location Ping"):
                if not ping_text.strip():
                    st.error("Please enter a short location update.")
                else:
                    update_user_location(ping_name, ping_text.strip())
                    st.rerun()

        if not users_df.empty:
            ping_table = users_df[["Name", "Hotel Room", "Live Location Ping"]].fillna("")
            st.table(ping_table)

    with st.container():
        st.subheader("M.I.A. List")
        next_meal = get_next_meal(meals_df)
        next_meal_text = (
            f"Next meal: {next_meal['Meal Name']} at {next_meal['Time']}"
            if next_meal is not None
            else "No upcoming meal plans found."
        )
        st.caption(next_meal_text)

        if users_df.empty:
            st.info("No users found for M.I.A. checks.")
            return

        def user_missing(row: pd.Series) -> bool:
            inbound_missing = not row["Inbound Car"].strip()
            outbound_missing = not row["Outbound Car"].strip()
            meal_missing = True
            if next_meal is not None:
                meal_rsvps = normalize_list_field(next_meal.get("RSVPs", ""))
                meal_missing = row["Name"] not in meal_rsvps
            else:
                meal_missing = False
            return inbound_missing or outbound_missing or meal_missing

        mia_df = users_df[users_df.apply(user_missing, axis=1)]
        if mia_df.empty:
            st.success("Everyone has at least one transport assignment and meal RSVP on file.")
        else:
            st.warning("These people need immediate follow-up:")
            st.table(mia_df[["Name", "Hotel Room", "Inbound Car", "Outbound Car"]].fillna(""))


def render_transport_tab(users_df: pd.DataFrame, rides_df: pd.DataFrame) -> None:
    st.header("🚗 Transport")
    if rides_df.empty:
        st.info("No transport rides have been scheduled yet.")

    # FIX: Grab the time at the very top of the tab
    now = get_local_now()
    
    # NEW: Automatically switch the default toggle based on the time of day
    # If the hour is before 13:00 (1 PM), default index is 0 ("Inbound"). Otherwise, index is 1 ("Outbound").
    default_tab_index = 0 if now.hour < 13 else 1

    direction_choice = st.radio(
        "Choose a view",
        options=["Inbound to Con", "Outbound/Return"],
        index=default_tab_index,
        horizontal=True,
    )
    direction_value = "Inbound" if direction_choice == "Inbound to Con" else "Outbound"
    filtered_rides = rides_df[rides_df["Direction"] == direction_value].copy()

    def seats_left(row: pd.Series) -> int:
        passengers = normalize_list_field(row["Passengers"])
        return max(int(row["Total Seats"] or 0) - len(passengers), 0)

    if not filtered_rides.empty:
        filtered_rides["Parsed Time"] = filtered_rides["Departure Time"].apply(parse_datetime)
        filtered_rides["Seats Left"] = filtered_rides.apply(seats_left, axis=1)
        
        # Keep rides visible for 2 hours AFTER they depart
        cutoff_time = now - timedelta(hours=2)
        filtered_rides = filtered_rides[filtered_rides["Parsed Time"] >= cutoff_time]
        filtered_rides = filtered_rides.sort_values("Parsed Time").fillna("")

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
            
            # If the event is in the past, gray it out
            if minutes_left < 0:
                border_color = "#374151"
                time_warning = f"<span style='color:#6b7280; font-style:italic;'> (Departed)</span>"
                card_opacity = "0.5"
            elif 0 <= minutes_left <= 60:
                ratio = minutes_left / 60.0 
                r = int(239 - (239 - 34) * ratio)
                g = int(68 + (197 - 68) * ratio)
                b = int(68 + (94 - 68) * ratio)
                border_color = f"rgb({r}, {g}, {b})"
                time_warning = f"<span style='color:{border_color}; font-weight:bold;'> ({int(minutes_left)} mins left!)</span>"

            with st.container():
                st.markdown(f"""
                <div style='border-left: 6px solid {border_color}; background-color: #111827; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; opacity: {card_opacity};'>
                    <h3 style='margin-top:0; margin-bottom: 0.2rem;'>{ride['Driver']}'s Car</h3>
                    <p style='margin: 0.2rem 0;'><b>Departure:</b> {ride['Departure Time']} {time_warning}</p>
                    <p style='margin: 0.2rem 0;'><b>Seats Left:</b> {ride['Seats Left']} / {ride['Total Seats']}</p>
                    <p style='margin: 0.2rem 0; color: #9ca3af;'><b>Passengers:</b> {ride['Passengers'] or 'None yet'}</p>
                </div>
                """, unsafe_allow_html=True)

    with st.container():
        st.subheader("Claim a Seat")
        # Only allow claiming seats for rides that haven't departed yet
        active_rides = filtered_rides[filtered_rides["Parsed Time"] >= now] if not filtered_rides.empty else filtered_rides
        
        if active_rides.empty:
            st.warning("No cars available to claim in this direction right now.")
        else:
            ride_options = []
            ride_map: Dict[str, dict] = {}
            for _, ride in active_rides.iterrows():
                option_label = f"{ride['Driver']} | {ride['Departure Time']} | {ride['Seats Left']} seats left"
                ride_options.append(option_label)
                ride_map[option_label] = ride.to_dict()

            with st.form("claim_seat_form"):
                claimer_name = st.selectbox(
                    "Your name",
                    options=sorted(users_df["Name"].dropna().unique()),
                )
                selected_ride_label = st.selectbox(
                    "Choose a car",
                    options=ride_options,
                )
                if st.form_submit_button("Claim Seat"):
                    selected_ride = ride_map[selected_ride_label]
                    if selected_ride["Seats Left"] <= 0:
                        st.error("This ride has no seats left.")
                    else:
                        claim_ride_seat(claimer_name, selected_ride, direction_value)
                        st.rerun()

    with st.container():
        st.subheader("Create a New Ride")
        with st.form("new_ride_form"):
            ride_direction = st.selectbox("Direction", options=["Inbound", "Outbound"])
            driver_name = st.selectbox(
                "Driver",
                options=sorted(users_df["Name"].dropna().unique()),
            )
            
            col1, col2 = st.columns(2)
            with col1:
                departure_date = st.date_input("Date")
            with col2:
                departure_time_input = st.time_input("Time")
                
            total_seats = st.number_input("Passenger seats", min_value=1, max_value=20, value=4)
            
            if st.form_submit_button("Create Ride"):
                datetime_str = f"{departure_date.strftime('%Y-%m-%d')} {departure_time_input.strftime('%H:%M')}"
                create_ride(ride_direction, driver_name, datetime_str, total_seats)
                st.rerun()


def render_food_tab(users_df: pd.DataFrame, meals_df: pd.DataFrame) -> None:
    st.header("🍔 Food & Events")
    if meals_df.empty:
        st.info("No meal plans have been added yet.")

    display_meals = meals_df.copy()
    display_meals["Parsed Time"] = display_meals["Time"].apply(parse_datetime)
    
    now = get_local_now()
    
    # FIX: Keep meals visible for 2 hours AFTER they start
    cutoff_time = now - timedelta(hours=2)
    display_meals = display_meals[display_meals["Parsed Time"] >= cutoff_time]
    display_meals = display_meals.sort_values(["Parsed Time", "Meal Name"]).fillna("")

    if display_meals.empty and not meals_df.empty:
        st.success("All scheduled events have concluded!")

    for _, meal in display_meals.iterrows():
        parsed_time = meal["Parsed Time"]
        minutes_left = (parsed_time - now).total_seconds() / 60.0
        
        border_color = "#1f2937" 
        time_warning = ""
        card_opacity = "1.0"
        
        # FIX: If the event is in the past, gray it out
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

        with st.container():
            st.markdown(f"""
            <div style='border-left: 6px solid {border_color}; background-color: #111827; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; opacity: {card_opacity};'>
                <h3 style='margin-top:0;'>{meal['Meal Name']}</h3>
                <p style='margin: 0.2rem 0;'><b>Time:</b> {meal['Time']} {time_warning}</p>
                <p style='margin: 0.2rem 0;'><b>Location:</b> {meal['Location (Optional)'] or 'TBD'}</p>
                <p style='margin: 0.2rem 0;'><b>Estimated Cost:</b> {meal['Cost']}</p>
                <p style='margin: 0.2rem 0; color: #9ca3af;'><b>RSVPs:</b> {meal['RSVPs'] or 'None yet'}</p>
            </div>
            """, unsafe_allow_html=True)

    with st.container():
        st.subheader("RSVP for a Meal")
        # Only allow RSVPing for meals that haven't started yet
        active_meals = display_meals[display_meals["Parsed Time"] >= now] if not display_meals.empty else display_meals
        
        if active_meals.empty:
            st.warning("Add an upcoming meal plan before RSVPing.")
        else:
            meal_options = [f"{row['Meal Name']} — {row['Time']}" for _, row in active_meals.iterrows()]
            meal_map = {label: row.to_dict() for label, (_, row) in zip(meal_options, active_meals.iterrows())}
            
            with st.form("meal_rsvp_form"):
                rsvp_name = st.selectbox("Your name", options=sorted(users_df["Name"].dropna().unique()))
                selected_meal_label = st.selectbox("Select meal", options=meal_options)
                if st.form_submit_button("RSVP"):
                    selected_meal = meal_map[selected_meal_label]
                    rsvp_meal(rsvp_name, selected_meal)
                    st.rerun()

    with st.container():
        st.subheader("Create Meal Plan")
        with st.form("create_meal_form"):
            meal_name = st.text_input("Meal name", placeholder="Group dinner at Japanese restaurant")
            
            col1, col2 = st.columns(2)
            with col1:
                meal_date = st.date_input("Date")
            with col2:
                meal_time = st.time_input("Time")
                
            meal_location = st.text_input("Location (optional)", placeholder="Food court, Ballroom B, etc.")
            meal_cost = st.text_input("Estimated cost", placeholder="€25")
            
            if st.form_submit_button("Add Meal"):
                if not meal_name.strip():
                    st.error("Meal name is required.")
                else:
                    datetime_str = f"{meal_date.strftime('%Y-%m-%d')} {meal_time.strftime('%H:%M')}"
                    create_meal(meal_name.strip(), datetime_str, meal_location.strip(), meal_cost.strip())
                    st.rerun()


def render_admin_tab(payments_df: pd.DataFrame, users_df: pd.DataFrame) -> None:
    st.header("💳 Admin & Finance")

    with st.container():
        st.subheader("Log a Payment")
        with st.form("payment_form"):
            payer = st.selectbox("Who paid?", options=sorted(users_df["Name"].dropna().unique()))
            amount = st.text_input("Amount", placeholder="45.00")
            description = st.text_input("Description", placeholder="Shared passes / parking / snacks")
            date_text = st.date_input("Date", value=get_local_now().date()).strftime("%Y-%m-%d")
            
            if st.form_submit_button("Record Payment"):
                if not amount.strip() or not description.strip():
                    st.error("Please enter both amount and a short description.")
                else:
                    log_payment(payer, amount.strip(), description.strip(), date_text)
                    st.rerun()

    with st.container():
        st.subheader("Transaction History")
        if payments_df.empty:
            st.info("No payments have been logged yet.")
        else:
            display_df = payments_df.copy()
            display_df["Date Parsed"] = display_df["Date"].apply(parse_datetime)
            display_df = display_df.sort_values("Date Parsed", ascending=False).drop(columns=["Date Parsed"])
            st.dataframe(display_df.fillna(""), use_container_width=True)


def main() -> None:
    st_autorefresh(interval=60000, limit=None, key="con_refresh")
    build_header()
    selected_tab = option_menu(
        None,
        ["🗺️ The Hub", "🚗 Transport", "🍔 Food & Events", "💳 Admin & Finance"],
        icons=["house", "bus-front", "cup", "wallet"],
        menu_icon="cast",
        default_index=0,
        orientation="horizontal",
        styles={
            "container": {"padding": "0!important", "background-color": "#0b1320"},
            "icon": {"color": "#7c3aed", "font-size": "18px"},
            "nav-link": {
                "font-size": "14px",
                "text-align": "center",
                "margin": "0px 4px",
                "border-radius": "10px",
                "color": "#d1d5db",
                "background-color": "#111827",
            },
            "nav-link-selected": {"background-color": "#1f2937", "color": "#f8fafc"},
        },
    )

    users_df = get_sheet_records("Users")
    rides_df = get_sheet_records("Rides")
    meals_df = get_sheet_records("Meals")
    payments_df = get_sheet_records("Payments")

    if selected_tab == "🗺️ The Hub":
        render_hub_tab(users_df, meals_df)
    elif selected_tab == "🚗 Transport":
        render_transport_tab(users_df, rides_df)
    elif selected_tab == "🍔 Food & Events":
        render_food_tab(users_df, meals_df)
    elif selected_tab == "💳 Admin & Finance":
        render_admin_tab(payments_df, users_df)


if __name__ == "__main__":
    main()