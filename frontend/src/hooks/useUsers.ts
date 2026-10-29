import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  completeOnboarding,
  deleteAvatar,
  deleteBanner,
  getCurrentUser,
  getUser,
  getUsers,
  pingLocation,
  updateName,
  updatePreferences,
  sendTestNotification,
  uploadAvatar,
  uploadBanner,
  type CompleteOnboardingPayload,
} from "../services/users.service";
import { useMemo } from "react";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import { isOwnName, ownNames } from "../utils/people";
import type { LocationPingRequest, UpdateNameRequest, UpdatePreferencesRequest } from "../types";

export function useCurrentUser(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.currentUser,
    queryFn: getCurrentUser,
    staleTime: STALE_TIME,
    enabled: options?.enabled ?? true,
    retry: false,
  });
}

/** Every name the signed-in member can appear under in a stored row (a ride's driver, an expense's payer, a photo's
 * uploader): their current name, Discord username and former names. `isMine(owner)` is the ownership check behind
 * every "my own" edit and delete button; the backend (`require_owner_or_admin`) accepts the same names. */
export function useMyNames() {
  const { data: me } = useCurrentUser();
  const { data: users } = useUsers();
  const myNames = useMemo(() => ownNames(me, users), [me, users]);
  return { me, myNames, isMine: (owner: string | null | undefined) => isOwnName(myNames, owner) };
}

/** Who the signed-in user may act for: everyone for an admin, only
 * themselves (under any of their own names) otherwise. Mirrors act_as() on the
 * backend, so a name picker never offers a name the API would refuse. Only for
 * what belongs to one person (paid by, location pings, cosplays); sign-ups accept anyone. */
export function useActingPermissions() {
  const { me, isMine } = useMyNames();
  const canActFor = (name: string) => !!me && (me.is_admin || isMine(name));
  return {
    canActFor,
    actable: (names: string[]) => names.filter(canActFor),
  };
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompleteOnboardingPayload) => completeOnboarding(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.userBase });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.currentUser });
    },
  });
}

export function useUser(name: string) {
  return useQuery({
    queryKey: QUERY_KEYS.user(name),
    queryFn: () => getUser(name),
    enabled: !!name,
    staleTime: STALE_TIME,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: getUsers,
    staleTime: STALE_TIME,
  });
}

export function usePingLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LocationPingRequest) => pingLocation(payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.user(variables.user_name) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
}

export function useSendTestNotification() {
  return useMutation({ mutationFn: sendTestNotification });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePreferencesRequest) => updatePreferences(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.userBase });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.currentUser });
    },
  });
}

export function useUploadBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ blob, mimeType, position }: { blob: Blob; mimeType: string; position?: string }) =>
      uploadBanner(blob, mimeType, position),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.userBase });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.currentUser });
    },
  });
}

export function useDeleteBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteBanner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.userBase });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.currentUser });
    },
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (blob: Blob) => uploadAvatar(blob),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.userBase });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.currentUser });
    },
  });
}

export function useDeleteAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAvatar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.userBase });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.currentUser });
    },
  });
}

export function useUpdateName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateNameRequest) => updateName(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.userBase });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.userNames });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.currentUser });
    },
  });
}
