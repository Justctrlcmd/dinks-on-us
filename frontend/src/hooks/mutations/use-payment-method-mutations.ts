"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentMethodKeys } from "@/config/query-keys";
import { createPaymentMethod, deletePaymentMethod, updatePaymentMethod } from "@/services/payment-method/payment-method-service";

function useRefreshPaymentMethods() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: paymentMethodKeys.all });
}

export function useCreatePaymentMethod() {
  const refresh = useRefreshPaymentMethods();
  return useMutation({ mutationFn: createPaymentMethod, onSuccess: refresh });
}

export function useUpdatePaymentMethod() {
  const refresh = useRefreshPaymentMethods();
  return useMutation({ mutationFn: updatePaymentMethod, onSuccess: refresh });
}

export function useDeletePaymentMethod() {
  const refresh = useRefreshPaymentMethods();
  return useMutation({ mutationFn: deletePaymentMethod, onSuccess: refresh });
}
