import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type { Meal, MealCategory, CreateMealRequest, UpdateMealRequest, RsvpRequest } from "../types";

export async function getMeals(): Promise<Meal[]> {
  const { data } = await apiClient.get<Meal[]>(apiRoutes.meals.base);
  return data;
}

/** The kinds of activity to pick from. */
export async function getMealCategories(): Promise<MealCategory[]> {
  const { data } = await apiClient.get<MealCategory[]>(apiRoutes.mealCategories);
  return data;
}

export async function createMeal(payload: CreateMealRequest): Promise<void> {
  await apiClient.post(apiRoutes.meals.base, payload);
}

export async function updateMeal(id: string, payload: UpdateMealRequest): Promise<void> {
  await apiClient.put(apiRoutes.meals.byId(id), payload);
}

export async function rsvpMeal(id: string, payload: RsvpRequest): Promise<void> {
  await apiClient.post(apiRoutes.meals.rsvp(id), payload);
}

export async function cancelRsvp(id: string, payload: RsvpRequest): Promise<void> {
  await apiClient.post(apiRoutes.meals.cancelRsvp(id), payload);
}

export async function deleteMeal(id: string): Promise<void> {
  await apiClient.delete(apiRoutes.meals.byId(id));
}
