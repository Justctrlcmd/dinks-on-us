"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authKeys, teamAccessKeys } from "@/config/query-keys";
import {
  activateTeamMember,
  createAccess,
  createTeamMember,
  deactivateTeamMember,
  deleteAccess,
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
  return useMutation({ mutationFn: createAccess, onSuccess: refresh });
}

export function useUpdateAccess() {
  const refresh = useRefreshTeamAccess();
  return useMutation({ mutationFn: updateAccess, onSuccess: refresh });
}

export function useDeleteAccess() {
  const refresh = useRefreshTeamAccess();
  return useMutation({ mutationFn: deleteAccess, onSuccess: refresh });
}

export function useCreateTeamMember() {
  const refresh = useRefreshTeamAccess();
  return useMutation({ mutationFn: createTeamMember, onSuccess: refresh });
}

export function useUpdateTeamMember() {
  const refresh = useRefreshTeamAccess();
  return useMutation({ mutationFn: updateTeamMember, onSuccess: refresh });
}

export function useActivateTeamMember() {
  const refresh = useRefreshTeamAccess();
  return useMutation({ mutationFn: activateTeamMember, onSuccess: refresh });
}

export function useDeactivateTeamMember() {
  const refresh = useRefreshTeamAccess();
  return useMutation({ mutationFn: deactivateTeamMember, onSuccess: refresh });
}

export function useResetTeamMemberPassword() {
  const refresh = useRefreshTeamAccess();
  return useMutation({ mutationFn: resetTeamMemberPassword, onSuccess: refresh });
}
