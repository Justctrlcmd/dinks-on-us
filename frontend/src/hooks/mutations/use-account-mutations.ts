"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRateLimitedMutation } from "@/hooks/mutations/use-rate-limited-mutation";
import { accountKeys, authKeys } from "@/config/query-keys";
import { updatePassword, updateProfile } from "@/services/account/account-service";

export function useUpdateProfile() {
  const client = useQueryClient();
  return useRateLimitedMutation("account-profile", {
    mutationFn: updateProfile,
    onSuccess: (response) => {
      client.setQueryData(authKeys.currentUser(), response.data);
      client.setQueryData(accountKeys.profile(), response.data);
    },
  });
}
export function useUpdatePassword() { return useRateLimitedMutation("account-password", { mutationFn: updatePassword }); }
