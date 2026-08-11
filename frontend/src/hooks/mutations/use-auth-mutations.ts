"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/config/query-keys";
import { forgotPassword, login, logout, register, resendVerification, resetPassword } from "@/services/auth/auth-service";

export function useLogin() {
  const client = useQueryClient();
  return useMutation({ mutationFn: login, onSuccess: (response) => client.setQueryData(authKeys.currentUser(), response.data) });
}
export function useRegister() {
  const client = useQueryClient();
  return useMutation({ mutationFn: register, onSuccess: (response) => client.setQueryData(authKeys.currentUser(), response.data) });
}
export function useLogout() {
  const client = useQueryClient();
  return useMutation({ mutationFn: logout, onSuccess: () => client.removeQueries({ queryKey: authKeys.all }) });
}
export function useForgotPassword() { return useMutation({ mutationFn: forgotPassword }); }
export function useResetPassword() { return useMutation({ mutationFn: resetPassword }); }
export function useResendVerification() { return useMutation({ mutationFn: resendVerification }); }
