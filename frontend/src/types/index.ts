// Auth
export interface LoginRequest {
  user_name: string;
  passcode: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// Users
export interface User {
  name: string;
  phone_number: string;
  hotel_room: string;
  live_location_ping: string;
  row_number: number;
  color: string;
  font: string;
  bio: string;
  banner_color: string;
  pronouns: string;
}

export type FontOption = "default" | "mono" | "serif" | "cursive" | "display";

export interface UpdatePreferencesRequest {
  color?: string;
  font?: FontOption;
  bio?: string;
  banner_color?: string;
  pronouns?: string;
}

export interface LocationPingRequest {
  user_name: string;
  zone: string;
  text: string;
}

// Rides
export type VehicleType = "Car" | "Public Transport";
export type Direction = "Inbound" | "Outbound" | "Restaurant";

export interface Ride {
  direction: Direction;
  vehicle_type: VehicleType;
  driver: string;
  departure_time: string;
  start_location: string;
  total_seats: number;
  passengers: string[];
  parking_info: string;
  maps_link: string;
  row_number: number;
  seats_left: number;
  is_full: boolean;
  is_public_transport: boolean;
  car_available: boolean;
  action_required: boolean;
}

export interface CreateRideRequest {
  direction: Direction;
  vehicle_type: VehicleType;
  driver: string;
  departure_time: string;
  start_location: string;
  total_seats: number;
  parking_info?: string;
  maps_link?: string;
  car_available?: boolean;
  action_required?: boolean;
}

export interface ClaimSeatRequest {
  user_name: string;
}

export interface RestaurantDriver {
  name: string;
  seats: number;
  passengers: string[];
}

export interface RestaurantDriverRequest {
  user_name: string;
  seats: number;
}

export interface LeaveRestaurantDriverRequest {
  user_name: string;
}

export interface RestaurantAssignRequest {
  user_name: string;
  driver_name: string;
}

export interface RestaurantUnassignRequest {
  user_name: string;
}

// Meals
export interface Meal {
  meal_name: string;
  time: string;
  location: string;
  cost: string;
  rsvps: string[];
  transport_needed: boolean;
  row_number: number;
}

export interface CreateMealRequest {
  meal_name: string;
  time: string;
  location?: string;
  cost?: string;
  transport_needed?: boolean;
}

export interface RsvpRequest {
  user_name: string;
}

// Payments
export interface Split {
  name: string;
  amount: number;
}

export interface Payment {
  paid_by: string;
  amount: number;
  description: string;
  date: string;
  row_number: number;
  splits: Split[];
}

export interface CreatePaymentRequest {
  paid_by: string;
  amount: number;
  description: string;
  date: string;
  splits?: Split[];
}

// Calendar
export interface CalendarEvent {
  date: string;
  event_id: string;
  event_name: string;
  is_hotel: boolean;
  participants: string[];
  row_number: number;
}

export interface CalendarRsvpRequest {
  user_name: string;
}

// UI helpers
export type TabId = "hub" | "transport" | "food" | "finance" | "more";

export type BaseProps = {
  options: string[];
  placeholder?: string;
  color?: "sky" | "rose" | "green";
};

export type SingleProps = BaseProps & {
  multiple?: false;
  value: string;
  onChange: (name: string) => void;
  maxSelect?: never;
};

export type MultiProps = BaseProps & {
  multiple: true;
  value: string[];
  onChange: (names: string[]) => void;
  maxSelect?: number;
};

export type NamePickerProps = SingleProps | MultiProps;

export interface MissingItem {
  name: string;
  items: string[];
}

export interface ActionAlert {
  date: string;
  eventName: string;
  missing: MissingItem[];
}

export interface RestaurantGap {
  rowNumber: number;
  location: string;
  departureTime: string;
  unassigned: string[];
}
