import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type { Feedback, FeedbackKind, FeedbackStatus } from "../types";

export interface SubmitFeedbackPayload {
  kind: FeedbackKind;
  message: string;
  anonymous: boolean;
}

export async function submitFeedback(payload: SubmitFeedbackPayload): Promise<void> {
  await apiClient.post(apiRoutes.feedback, { ...payload, app_version: __APP_VERSION__ });
}

// ── Admin ──────────────────────────────────────────────────────────────────────

export async function getAdminFeedback(): Promise<Feedback[]> {
  const { data } = await apiClient.get<Feedback[]>(apiRoutes.admin.feedback.base);
  return data;
}

export async function updateAdminFeedback(id: string, status: FeedbackStatus): Promise<void> {
  await apiClient.put(apiRoutes.admin.feedback.byId(id), { status });
}

export async function deleteAdminFeedback(id: string): Promise<void> {
  await apiClient.delete(apiRoutes.admin.feedback.byId(id));
}
