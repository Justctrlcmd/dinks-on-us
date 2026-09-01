"use client";

import { useQuery } from "@tanstack/react-query";
import { paymentProofRetentionKeys } from "@/config/query-keys";
import { getPaymentProofCleanupActivity, getPaymentProofCleanupPreview } from "@/services/payment-proof-retention/payment-proof-retention-service";
import type { PaymentProofCleanupRange } from "@/types/payment-proof-retention";

export function usePaymentProofCleanupPreview(range: PaymentProofCleanupRange | null) {
  return useQuery({
    queryKey: paymentProofRetentionKeys.preview(range),
    queryFn: ({ signal }) => getPaymentProofCleanupPreview(range as PaymentProofCleanupRange, signal),
    enabled: range !== null,
  });
}

export function usePaymentProofCleanupActivity(page: number) {
  return useQuery({
    queryKey: paymentProofRetentionKeys.activity(page),
    queryFn: ({ signal }) => getPaymentProofCleanupActivity(page, signal),
  });
}
