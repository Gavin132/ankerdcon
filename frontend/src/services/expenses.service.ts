import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type { Expense, CreateExpenseRequest } from "../types";

export async function getExpenses(): Promise<Expense[]> {
  const { data } = await apiClient.get<Expense[]>(apiRoutes.expenses.base);
  return data;
}

export async function createExpense(payload: CreateExpenseRequest): Promise<void> {
  await apiClient.post(apiRoutes.expenses.base, payload);
}

export async function deleteExpense(id: string, userName: string): Promise<void> {
  await apiClient.delete(apiRoutes.expenses.byId(id), { params: { user_name: userName } });
}

export async function claimShare(shareId: string): Promise<void> {
  await apiClient.post(apiRoutes.expenses.claimShare(shareId));
}

export async function confirmShare(shareId: string): Promise<void> {
  await apiClient.post(apiRoutes.expenses.confirmShare(shareId));
}
