"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRateLimitedMutation } from "@/hooks/mutations/use-rate-limited-mutation";
import { authKeys } from "@/config/query-keys";
import { login, logout, resendVerification } from "@/services/auth/auth-service";

export function useLogin() {
  const client = useQueryClient();
  return useRateLimitedMutation("auth-login", { mutationFn: login, onSuccess: (response) => client.setQueryData(authKeys.currentUser(), response.data) });
}
export function useLogout() {
  const client = useQueryClient();
  return useRateLimitedMutation("auth-logout", { mutationFn: logout, onSuccess: () => client.removeQueries({ queryKey: authKeys.all }) });
}
export function useResendVerification() { return useRateLimitedMutation("auth-resend-verification", { mutationFn: resendVerification }); }
