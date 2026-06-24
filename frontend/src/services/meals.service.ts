import { apiClient } from "../utils/api";
import type { Meal, CreateMealRequest, RsvpRequest } from "../types";

export async function getMeals(): Promise<Meal[]> {
  const { data } = await apiClient.get<Meal[]>("/api/meals/");
  return data;
}

export async function createMeal(payload: CreateMealRequest): Promise<void> {
  await apiClient.post("/api/meals/", payload);
}

export async function rsvpMeal(id: string, payload: RsvpRequest): Promise<void> {
  await apiClient.post(`/api/meals/${id}/rsvp`, payload);
}

export async function cancelRsvp(id: string, payload: RsvpRequest): Promise<void> {
  await apiClient.post(`/api/meals/${id}/cancel-rsvp`, payload);
}

export async function deleteMeal(id: string): Promise<void> {
  await apiClient.delete(`/api/meals/${id}`);
}
