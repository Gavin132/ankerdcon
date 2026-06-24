import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCalendar, rsvpCalendarEvent, leaveCalendarEvent } from "../services/calendar.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";

export function useCalendar() {
  return useQuery({
    queryKey: QUERY_KEYS.calendar,
    queryFn: getCalendar,
    staleTime: STALE_TIME,
  });
}

export function useRsvpCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userName }: { id: string; userName: string }) =>
      rsvpCalendarEvent(id, userName),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.calendar }),
  });
}

export function useLeaveCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userName }: { id: string; userName: string }) =>
      leaveCalendarEvent(id, userName),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.calendar }),
  });
}
