import { useQuery } from "@tanstack/react-query";
import { getCalendar } from "../services/calendar.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";

export function useCalendar() {
  return useQuery({
    queryKey: QUERY_KEYS.calendar,
    queryFn: getCalendar,
    staleTime: STALE_TIME,
  });
}
