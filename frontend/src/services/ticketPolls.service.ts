import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type { TicketPoll } from "../types";

/** The trip's ticket vote, or null when there is none. */
export async function getTicketPoll(tripId: string): Promise<TicketPoll | null> {
  const { data } = await apiClient.get<TicketPoll | null>(apiRoutes.ticketPolls.trip(tripId));
  return data ?? null;
}

export async function openTicketPoll(tripId: string, options: { label: string; price: number }[]): Promise<TicketPoll> {
  const { data } = await apiClient.put<TicketPoll>(apiRoutes.ticketPolls.trip(tripId), { options });
  return data;
}

/** `userName` votes for someone else (admins only); leave it out to vote for yourself. */
export async function castTicketVote(tripId: string, choice: string, userName?: string): Promise<void> {
  await apiClient.put(apiRoutes.ticketPolls.vote(tripId), { choice, user_name: userName });
}

export async function markTicketsBought(tripId: string, buyer: string, optionId: string): Promise<TicketPoll> {
  const { data } = await apiClient.post<TicketPoll>(apiRoutes.ticketPolls.bought(tripId), { buyer, option_id: optionId });
  return data;
}

export async function deleteTicketPoll(tripId: string): Promise<void> {
  await apiClient.delete(apiRoutes.ticketPolls.trip(tripId));
}
