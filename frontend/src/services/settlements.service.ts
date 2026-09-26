import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type { CreateSettlementRequest, Settlement, SettleUpOverview } from "../types";

export async function getSettleUp(): Promise<SettleUpOverview> {
  const { data } = await apiClient.get<SettleUpOverview>(apiRoutes.settlements.base);
  return data;
}

export async function createSettlement(payload: CreateSettlementRequest): Promise<Settlement> {
  const { data } = await apiClient.post<Settlement>(apiRoutes.settlements.base, payload);
  return data;
}

export async function markSettlementPaid(id: string): Promise<void> {
  await apiClient.post(apiRoutes.settlements.paid(id));
}

export async function confirmSettlement(id: string): Promise<void> {
  await apiClient.post(apiRoutes.settlements.confirm(id));
}

export async function withdrawSettlement(id: string): Promise<void> {
  await apiClient.delete(apiRoutes.settlements.byId(id));
}
