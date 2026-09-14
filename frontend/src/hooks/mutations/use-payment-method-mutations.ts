"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRateLimitedMutation } from "@/hooks/mutations/use-rate-limited-mutation";
import { paymentMethodKeys } from "@/config/query-keys";
import { createPaymentMethod, deletePaymentMethod, updatePaymentMethod } from "@/services/payment-method/payment-method-service";

function useRefreshPaymentMethods() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: paymentMethodKeys.all });
}

export function useCreatePaymentMethod() {
  const refresh = useRefreshPaymentMethods();
  return useRateLimitedMutation("payment-method-create", { mutationFn: createPaymentMethod, onSuccess: refresh });
}

export function useUpdatePaymentMethod() {
  const refresh = useRefreshPaymentMethods();
  return useRateLimitedMutation("payment-method-update", { mutationFn: updatePaymentMethod, onSuccess: refresh });
}

export function useDeletePaymentMethod() {
  const refresh = useRefreshPaymentMethods();
  return useRateLimitedMutation("payment-method-delete", { mutationFn: deletePaymentMethod, onSuccess: refresh });
}
