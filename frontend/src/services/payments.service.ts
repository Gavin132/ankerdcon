import { apiClient } from "../utils/api";
import type { Payment, CreatePaymentRequest } from "../types";

export async function getPayments(): Promise<Payment[]> {
  const { data } = await apiClient.get<Payment[]>("/api/payments/");
  return data;
}

export async function createPayment(
  payload: CreatePaymentRequest,
): Promise<Payment> {
  const { data } = await apiClient.post<Payment>("/api/payments/", payload);
  return data;
}
