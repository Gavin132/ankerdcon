// Auth
export interface LoginRequest {
  passphrase: string;
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
}

export interface LocationPingRequest {
  user_name: string;
  zone: string;
  text: string;
}

// Rides
export type VehicleType = "Car" | "Public Transport";
export type Direction = "Inbound" | "Outbound";

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
}

export interface ClaimSeatRequest {
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

// UI helpers
export type TabId = "hub" | "transport" | "food" | "finance" | "more";
