import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSettleUp,
  createSettlement,
  markSettlementPaid,
  confirmSettlement,
  withdrawSettlement,
} from "../services/settlements.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import type { CreateSettlementRequest } from "../types";

export function useSettleUp() {
  return useQuery({
    queryKey: QUERY_KEYS.settlements,
    queryFn: getSettleUp,
    staleTime: STALE_TIME,
  });
}

/** Settlements change share statuses too, so both lists are refreshed. */
function useSettlementMutation<T>(fn: (arg: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.settlements });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.expenses });
    },
  });
}

export const useCreateSettlement   = () => useSettlementMutation((p: CreateSettlementRequest) => createSettlement(p));
export const useMarkSettlementPaid = () => useSettlementMutation((id: string) => markSettlementPaid(id));
export const useConfirmSettlement  = () => useSettlementMutation((id: string) => confirmSettlement(id));
export const useWithdrawSettlement = () => useSettlementMutation((id: string) => withdrawSettlement(id));
