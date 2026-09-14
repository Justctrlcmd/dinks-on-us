"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRateLimitedMutation } from "@/hooks/mutations/use-rate-limited-mutation";
import { authKeys } from "@/config/query-keys";
import { forgotPassword, login, logout, register, resendVerification, resetPassword } from "@/services/auth/auth-service";

export function useLogin() {
  const client = useQueryClient();
  return useRateLimitedMutation("auth-login", { mutationFn: login, onSuccess: (response) => client.setQueryData(authKeys.currentUser(), response.data) });
}
export function useRegister() {
  const client = useQueryClient();
  return useRateLimitedMutation("auth-register", { mutationFn: register, onSuccess: (response) => client.setQueryData(authKeys.currentUser(), response.data) });
}
export function useLogout() {
  const client = useQueryClient();
  return useRateLimitedMutation("auth-logout", { mutationFn: logout, onSuccess: () => client.removeQueries({ queryKey: authKeys.all }) });
}
export function useForgotPassword() { return useRateLimitedMutation("auth-forgot-password", { mutationFn: forgotPassword }); }
export function useResetPassword() { return useRateLimitedMutation("auth-reset-password", { mutationFn: resetPassword }); }
export function useResendVerification() { return useRateLimitedMutation("auth-resend-verification", { mutationFn: resendVerification }); }
