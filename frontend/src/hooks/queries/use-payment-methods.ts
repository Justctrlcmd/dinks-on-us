"use client";

import { useQuery } from "@tanstack/react-query";
import { paymentMethodKeys } from "@/config/query-keys";
import { getPaymentMethods, getPublicPaymentMethods } from "@/services/payment-method/payment-method-service";

export function usePublicPaymentMethods() {
  return useQuery({
    queryKey: paymentMethodKeys.public(),
    queryFn: ({ signal }) => getPublicPaymentMethods(signal).then((response) => response.data),
    staleTime: 60_000,
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: paymentMethodKeys.management(),
    queryFn: ({ signal }) => getPaymentMethods(signal).then((response) => response.data),
  });
}
