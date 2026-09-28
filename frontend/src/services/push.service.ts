import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";

export interface PushSubscribePayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function subscribePush(payload: PushSubscribePayload): Promise<void> {
  await apiClient.post(apiRoutes.push.subscribe, payload);
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  await apiClient.delete(apiRoutes.push.subscribe, { data: { endpoint } });
}
