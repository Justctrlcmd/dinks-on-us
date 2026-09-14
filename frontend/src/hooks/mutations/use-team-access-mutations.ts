"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRateLimitedMutation } from "@/hooks/mutations/use-rate-limited-mutation";
import { authKeys, teamAccessKeys } from "@/config/query-keys";
import {
  activateTeamMember,
  createAccess,
  createTeamMember,
  deactivateTeamMember,
  deleteAccess,
  deleteTeamMember,
  resetTeamMemberPassword,
  updateAccess,
  updateTeamMember,
} from "@/services/team-access/team-access-service";

function useRefreshTeamAccess() {
  const client = useQueryClient();
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: teamAccessKeys.all }),
      client.invalidateQueries({ queryKey: authKeys.currentUser() }),
    ]);
  };
}

export function useCreateAccess() {
  const refresh = useRefreshTeamAccess();
  return useRateLimitedMutation("access-create", { mutationFn: createAccess, onSuccess: refresh });
}

export function useUpdateAccess() {
  const refresh = useRefreshTeamAccess();
  return useRateLimitedMutation("access-update", { mutationFn: updateAccess, onSuccess: refresh });
}

export function useDeleteAccess() {
  const refresh = useRefreshTeamAccess();
  return useRateLimitedMutation("access-delete", { mutationFn: deleteAccess, onSuccess: refresh });
}

export function useCreateTeamMember() {
  const refresh = useRefreshTeamAccess();
  return useRateLimitedMutation("team-create", { mutationFn: createTeamMember, onSuccess: refresh });
}

export function useUpdateTeamMember() {
  const refresh = useRefreshTeamAccess();
  return useRateLimitedMutation("team-update", { mutationFn: updateTeamMember, onSuccess: refresh });
}

export function useActivateTeamMember() {
  const refresh = useRefreshTeamAccess();
  return useRateLimitedMutation("team-activate", { mutationFn: activateTeamMember, onSuccess: refresh });
}

export function useDeactivateTeamMember() {
  const refresh = useRefreshTeamAccess();
  return useRateLimitedMutation("team-deactivate", { mutationFn: deactivateTeamMember, onSuccess: refresh });
}

export function useDeleteTeamMember() {
  const refresh = useRefreshTeamAccess();
  return useRateLimitedMutation("team-delete", { mutationFn: deleteTeamMember, onSuccess: refresh });
}

export function useResetTeamMemberPassword() {
  const refresh = useRefreshTeamAccess();
  return useRateLimitedMutation("team-password-reset", { mutationFn: resetTeamMemberPassword, onSuccess: refresh });
}
