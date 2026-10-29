import { useCurrentUser, useUsers } from "./useUsers";
import { groupPeople } from "../utils/people";

/** Whether the signed-in member is on a list of stored names (participants, passengers), under any of their names. */
export function useIsOnList(names: string[]): boolean {
  const { data: users = [] } = useUsers();
  const { data: me } = useCurrentUser();
  if (!me) return false;
  return groupPeople(names, users).some((person) => person.user?.id === me.id);
}
