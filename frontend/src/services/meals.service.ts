import { apiClient } from "../utils/api";
import type { Meal, CreateMealRequest, RsvpRequest } from "../types";

export async function getMeals(): Promise<Meal[]> {
  const { data } = await apiClient.get<Meal[]>("/api/meals/");
  return data;
}

export async function createMeal(payload: CreateMealRequest): Promise<void> {
  await apiClient.post("/api/meals/", payload);
}

export async function rsvpMeal(rowNumber: number, payload: RsvpRequest): Promise<void> {
  await apiClient.post(`/api/meals/${rowNumber}/rsvp`, payload);
}

export async function cancelRsvp(rowNumber: number, payload: RsvpRequest): Promise<void> {
  await apiClient.post(`/api/meals/${rowNumber}/cancel-rsvp`, payload);
}

export async function deleteMeal(rowNumber: number): Promise<void> {
  await apiClient.delete(`/api/meals/${rowNumber}`);
}
