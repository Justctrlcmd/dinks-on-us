"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { accountKeys, authKeys } from "@/config/query-keys";
import { updatePassword, updateProfile } from "@/services/account/account-service";

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (response) => {
      client.setQueryData(authKeys.currentUser(), response.data);
      client.setQueryData(accountKeys.profile(), response.data);
    },
  });
}
export function useUpdatePassword() { return useMutation({ mutationFn: updatePassword }); }
