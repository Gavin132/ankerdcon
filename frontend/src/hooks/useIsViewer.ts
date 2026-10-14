import { useCurrentUser } from "./useUsers";

/** Whether the signed-in member is read-only: they can look at everything and change nothing, so the
 * buttons that would change something are left out. An admin is never read-only. */
export function useIsViewer(): boolean {
  const { data: me } = useCurrentUser();
  return !!me?.is_viewer && !me.is_admin;
}
