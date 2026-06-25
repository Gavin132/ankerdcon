import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type { Payment, CreatePaymentRequest } from "../types";

export async function getPayments(): Promise<Payment[]> {
  const { data } = await apiClient.get<Payment[]>(apiRoutes.payments.base);
  return data;
}

export async function createPayment(payload: CreatePaymentRequest): Promise<void> {
  await apiClient.post(apiRoutes.payments.base, payload);
}

export async function deletePayment(id: string, userName: string): Promise<void> {
  await apiClient.delete(apiRoutes.payments.byId(id), { params: { user_name: userName } });
}
