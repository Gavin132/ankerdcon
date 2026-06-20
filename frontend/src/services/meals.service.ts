import { apiClient } from "../utils/api";
import type { Meal, CreateMealRequest, RsvpRequest } from "../types";

export async function getMeals(): Promise<Meal[]> {
  const { data } = await apiClient.get<Meal[]>("/api/meals/");
  return data;
}

export async function createMeal(payload: CreateMealRequest): Promise<Meal> {
  const { data } = await apiClient.post<Meal>("/api/meals/", payload);
  return data;
}

export async function rsvpMeal(
  rowNumber: number,
  payload: RsvpRequest,
): Promise<Meal> {
  const { data } = await apiClient.post<Meal>(
    `/api/meals/${rowNumber}/rsvp`,
    payload,
  );
  return data;
}

export async function cancelRsvp(
  rowNumber: number,
  payload: RsvpRequest,
): Promise<Meal> {
  const { data } = await apiClient.post<Meal>(
    `/api/meals/${rowNumber}/cancel-rsvp`,
    payload,
  );
  return data;
}
