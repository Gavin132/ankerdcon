import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  castTicketVote, deleteTicketPoll, getTicketPoll, markTicketsBought, openTicketPoll, withdrawTicketVote,
} from "../services/ticketPolls.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import type { TicketPoll } from "../types";

/** `enabled` false skips the request, for a list that only needs the vote once it is opened. */
export function useTicketPoll(tripId: string, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.ticketPoll(tripId),
    queryFn: () => getTicketPoll(tripId),
    staleTime: STALE_TIME,
    enabled: !!tripId && enabled,
  });
}

export function useOpenTicketPoll(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (options: { label: string; price: number }[]) => openTicketPoll(tripId, options),
    onSuccess: (poll) => qc.setQueryData(QUERY_KEYS.ticketPoll(tripId), poll),
  });
}

/** The vote shows at once and is put back when the server refuses it. */
export function useCastTicketVote(tripId: string) {
  const qc = useQueryClient();
  const key = QUERY_KEYS.ticketPoll(tripId);
  return useMutation({
    mutationFn: ({ choice, userName }: { choice: string; userName: string }) => castTicketVote(tripId, choice, userName),
    onMutate: async ({ choice, userName }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<TicketPoll | null>(key);
      qc.setQueryData<TicketPoll | null>(key, (old) =>
        old ? { ...old, votes: [...old.votes.filter((v) => v.voter !== userName), { voter: userName, choice }] } : old,
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.previous ?? null),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/** The vote disappears at once and is put back when the server refuses. */
export function useWithdrawTicketVote(tripId: string) {
  const qc = useQueryClient();
  const key = QUERY_KEYS.ticketPoll(tripId);
  return useMutation({
    mutationFn: ({ userName }: { userName: string }) => withdrawTicketVote(tripId, userName),
    onMutate: async ({ userName }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<TicketPoll | null>(key);
      qc.setQueryData<TicketPoll | null>(key, (old) => (old ? { ...old, votes: old.votes.filter((v) => v.voter !== userName) } : old));
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.previous ?? null),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useTicketsBought(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ buyer, optionId }: { buyer: string; optionId: string }) => markTicketsBought(tripId, buyer, optionId),
    onSuccess: (poll) => qc.setQueryData(QUERY_KEYS.ticketPoll(tripId), poll),
  });
}

export function useDeleteTicketPoll(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteTicketPoll(tripId),
    onSuccess: () => qc.setQueryData(QUERY_KEYS.ticketPoll(tripId), null),
  });
}
