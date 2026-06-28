// Auth
export interface LoginRequest {
  user_name: string;
  passcode: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// Badges
export interface Badge {
  id: string;
  name: string;
  description: string;
  image_url: string;
  display_order: number;
}

// Users
export interface User {
  id?: string;
  name: string;
  phone_number: string;
  hotel_room: string;
  live_location_ping: string;
  color: string;
  font: string;
  bio: string;
  banner_color: string;
  pronouns: string;
  avatar_url?: string;
  banner_url?: string;
  banner_position?: string;
  discord_id?: string;
  discord_username?: string;
  is_admin?: boolean;
  is_active?: boolean;
  is_first_login?: boolean;
  onboarding_completed?: boolean;
  allow_dm?: boolean;
  aliases?: string[];
  badge_ids?: string[];
  created_at?: string;
}

export type FontOption = "default" | "mono" | "serif" | "cursive" | "display";

export interface UpdateNameRequest {
  new_name: string;
}

export interface UpdatePreferencesRequest {
  color?: string;
  font?: FontOption;
  bio?: string;
  banner_color?: string;
  banner_position?: string;
  pronouns?: string;
  phone_number?: string;
  aliases?: string[];
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
  id: string;
  direction: Direction;
  vehicle_type: VehicleType;
  driver: string;
  departure_time: string;
  start_location: string;
  total_seats: number;
  passengers: string[];
  parking_info: string;
  end_location: string | null;
  seats_left: number;
  is_full: boolean;
  is_public_transport: boolean;
  car_available: boolean;
  action_required: boolean;
  linked_event_id?: string;
  linked_meal_id?: string;
  restaurant_drivers?: RestaurantDriver[];
}

export interface CreateRideRequest {
  direction: Direction;
  vehicle_type: VehicleType;
  driver: string;
  departure_time: string;
  start_location: string;
  total_seats: number;
  parking_info?: string;
  end_location?: string;
  car_available?: boolean;
  action_required?: boolean;
  linked_event_id?: string;
  linked_meal_id?: string;
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
  id: string;
  meal_name: string;
  time: string;
  location: string;
  cost: number;
  transport_needed: boolean;
  participants: string[];
  linked_event_id?: string;
  website?: string;
  menu_url?: string;
  description?: string;
  dietary_options?: string;
  parking_info?: string;
  extra_notes?: string;
}

export interface CreateMealRequest {
  meal_name: string;
  time: string;
  location?: string;
  cost?: string;
  transport_needed?: boolean;
  linked_event_id?: string;
  website?: string;
  menu_url?: string;
  description?: string;
  dietary_options?: string;
  parking_info?: string;
  extra_notes?: string;
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
  id: string;
  paid_by: string;
  amount: number;
  description: string;
  date: string;
  splits: Split[];
}

export interface CreatePaymentRequest {
  paid_by: string;
  amount: number;
  description: string;
  date: string;
  splits?: Split[];
}

export interface TicketType {
  title: string;
  price: number;
}

export interface HotelRoom {
  id: string;
  event_id: string;
  room_number: string;
  floor?: string;
  instructions?: string;
  occupants: string[];
  created_at?: string;
}

export interface CreateHotelRoomRequest {
  room_number: string;
  floor?: string;
  instructions?: string;
  occupants?: string[];
}

export interface CalendarEvent {
  id: string;
  event_group_id?: string;
  multi_day_id?: string;
  event_name: string;
  date: string;
  is_hotel: boolean;
  participants: string[];
  description?: string;
  location?: string;
  website?: string;
  ticket_url?: string;
  ticket_sale_start?: string;
  ticket_types?: TicketType[];
  locker_info?: string;
  parking_info?: string;
  special_instructions?: string;
  what_to_bring?: string;
}

export interface AdminStats {
  users: number;
  rides: number;
  meals: number;
  events: number;
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
  id: string;
  location: string;
  departureTime: string;
  unassigned: string[];
}
