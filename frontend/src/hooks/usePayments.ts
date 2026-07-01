import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPayments, createPayment, deletePayment } from "../services/payments.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import type { CreatePaymentRequest } from "../types";

export function usePayments() {
  return useQuery({
    queryKey: QUERY_KEYS.payments,
    queryFn: getPayments,
    staleTime: STALE_TIME,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePaymentRequest) => createPayment(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.payments }),
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userName }: { id: string; userName: string }) =>
      deletePayment(id, userName),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.payments }),
  });
}
