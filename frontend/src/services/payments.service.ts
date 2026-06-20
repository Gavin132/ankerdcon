import { apiClient } from "../utils/api";
import type { Payment, CreatePaymentRequest } from "../types";

export async function getPayments(): Promise<Payment[]> {
  const { data } = await apiClient.get<Payment[]>("/api/payments/");
  return data;
}

export async function createPayment(payload: CreatePaymentRequest): Promise<void> {
  await apiClient.post("/api/payments/", payload);
}

export async function deletePayment(rowNumber: number, userName: string): Promise<void> {
  await apiClient.delete(`/api/payments/${rowNumber}`, { params: { user_name: userName } });
}
