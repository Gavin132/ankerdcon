import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getExpenses,
  createExpense,
  deleteExpense,
  claimShare,
  confirmShare,
} from "../services/expenses.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import type { CreateExpenseRequest } from "../types";

export function useExpenses() {
  return useQuery({
    queryKey: QUERY_KEYS.expenses,
    queryFn: getExpenses,
    staleTime: STALE_TIME,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExpenseRequest) => createExpense(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.expenses }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userName }: { id: string; userName: string }) =>
      deleteExpense(id, userName),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.expenses }),
  });
}

export function useClaimShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) => claimShare(shareId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.expenses }),
  });
}

export function useConfirmShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) => confirmShare(shareId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.expenses }),
  });
}
