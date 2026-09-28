import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteAdminFeedback,
  getAdminFeedback,
  submitFeedback,
  updateAdminFeedback,
} from "../services/feedback.service";
import type { SubmitFeedbackPayload } from "../services/feedback.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import type { FeedbackStatus } from "../types";

export function useSubmitFeedback() {
  return useMutation({ mutationFn: (payload: SubmitFeedbackPayload) => submitFeedback(payload) });
}

export function useAdminFeedback() {
  return useQuery({ queryKey: QUERY_KEYS.adminFeedback, queryFn: getAdminFeedback, staleTime: STALE_TIME });
}

export function useUpdateFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: FeedbackStatus }) => updateAdminFeedback(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.adminFeedback }),
  });
}

export function useDeleteFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminFeedback(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.adminFeedback }),
  });
}
