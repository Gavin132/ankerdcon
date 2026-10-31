import { useQuery } from "@tanstack/react-query";
import { getLoginProviders } from "../services/users.service";

/** The ways the member can sign in. `null` while unknown (or when Supabase could not say), and then nothing that
 * depends on it is offered. Only asked for when `enabled`. */
export function useLoginProviders(enabled: boolean): string[] | null {
  const { data } = useQuery({
    queryKey: ["loginProviders"],
    queryFn: getLoginProviders,
    enabled,
    staleTime: 60_000,
    retry: false,
  });
  return data ?? null;
}
