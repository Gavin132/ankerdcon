import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteBanner,
  getPublicUserNames,
  getUser,
  getUsers,
  pingLocation,
  updateName,
  updatePreferences,
  uploadBanner,
} from "../services/users.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import type { LocationPingRequest, UpdateNameRequest, UpdatePreferencesRequest } from "../types";

export function usePublicUserNames() {
  return useQuery({
    queryKey: QUERY_KEYS.userNames,
    queryFn: getPublicUserNames,
    staleTime: STALE_TIME,
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

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePreferencesRequest) => updatePreferences(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.userBase });
    },
  });
}

export function useUploadBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ blob, mimeType }: { blob: Blob; mimeType: string }) =>
      uploadBanner(blob, mimeType),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.userBase });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
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
    },
  });
}
