import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCalendar, rsvpCalendarEvent, leaveCalendarEvent } from "../services/calendar.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import type { CalendarEvent } from "../types";

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
    onMutate: async ({ id, userName }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.calendar });
      const previous = qc.getQueryData<CalendarEvent[]>(QUERY_KEYS.calendar);
      qc.setQueryData<CalendarEvent[]>(QUERY_KEYS.calendar, (old) =>
        old?.map((ev) =>
          ev.id === id && !ev.participants.includes(userName)
            ? { ...ev, participants: [...ev.participants, userName] }
            : ev,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(QUERY_KEYS.calendar, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.calendar }),
  });
}

export function useLeaveCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userName }: { id: string; userName: string }) =>
      leaveCalendarEvent(id, userName),
    onMutate: async ({ id, userName }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.calendar });
      const previous = qc.getQueryData<CalendarEvent[]>(QUERY_KEYS.calendar);
      qc.setQueryData<CalendarEvent[]>(QUERY_KEYS.calendar, (old) =>
        old?.map((ev) =>
          ev.id === id
            ? { ...ev, participants: ev.participants.filter((p) => p !== userName) }
            : ev,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(QUERY_KEYS.calendar, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.calendar }),
  });
}
