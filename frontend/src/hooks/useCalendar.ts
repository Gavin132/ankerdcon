import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCalendar,
  rsvpCalendarEvent,
  leaveCalendarEvent,
  getHotelRooms,
  createHotelRoom,
  assignHotelRoom,
  leaveHotelRoom,
} from "../services/calendar.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import type { CalendarEvent, CreateHotelRoomRequest, HotelRoom } from "../types";

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

export function useHotelRooms(eventId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.hotelRooms(eventId),
    queryFn: () => getHotelRooms(eventId),
    staleTime: STALE_TIME,
    enabled: (options?.enabled ?? true) && !!eventId,
  });
}

export function useCreateHotelRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, payload }: { eventId: string; payload: CreateHotelRoomRequest }) =>
      createHotelRoom(eventId, payload),
    onSuccess: (_data, { eventId }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.hotelRooms(eventId) });
    },
  });
}

export function useAssignHotelRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, roomId, userNames }: { eventId: string; roomId: string; userNames: string[] }) =>
      assignHotelRoom(eventId, roomId, userNames),
    onMutate: async ({ eventId, roomId, userNames }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.hotelRooms(eventId) });
      const previous = qc.getQueryData<HotelRoom[]>(QUERY_KEYS.hotelRooms(eventId));
      qc.setQueryData<HotelRoom[]>(QUERY_KEYS.hotelRooms(eventId), (old = []) =>
        old.map((r) =>
          r.id === roomId
            ? { ...r, occupants: [...new Set([...r.occupants, ...userNames])] }
            : r,
        ),
      );
      return { previous };
    },
    onError: (_e, { eventId }, ctx) => {
      if (ctx?.previous) qc.setQueryData(QUERY_KEYS.hotelRooms(eventId), ctx.previous);
    },
    onSettled: (_d, _e, { eventId }) => qc.invalidateQueries({ queryKey: QUERY_KEYS.hotelRooms(eventId) }),
  });
}

export function useLeaveHotelRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, roomId, userName }: { eventId: string; roomId: string; userName: string }) =>
      leaveHotelRoom(eventId, roomId, userName),
    onMutate: async ({ eventId, roomId, userName }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.hotelRooms(eventId) });
      const previous = qc.getQueryData<HotelRoom[]>(QUERY_KEYS.hotelRooms(eventId));
      qc.setQueryData<HotelRoom[]>(QUERY_KEYS.hotelRooms(eventId), (old = []) =>
        old.map((r) =>
          r.id === roomId ? { ...r, occupants: r.occupants.filter((o) => o !== userName) } : r,
        ),
      );
      return { previous };
    },
    onError: (_e, { eventId }, ctx) => {
      if (ctx?.previous) qc.setQueryData(QUERY_KEYS.hotelRooms(eventId), ctx.previous);
    },
    onSettled: (_d, _e, { eventId }) => qc.invalidateQueries({ queryKey: QUERY_KEYS.hotelRooms(eventId) }),
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
