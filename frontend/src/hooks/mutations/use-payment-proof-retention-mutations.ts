"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRateLimitedMutation } from "@/hooks/mutations/use-rate-limited-mutation";
import { dashboardKeys, historyKeys, paymentProofRetentionKeys, reservationKeys } from "@/config/query-keys";
import { deletePaymentProofs } from "@/services/payment-proof-retention/payment-proof-retention-service";
import type { DeletePaymentProofCleanupInput } from "@/types/payment-proof-retention";

export function useDeletePaymentProofs() {
  const client = useQueryClient();

  return useRateLimitedMutation("payment-proof-cleanup", {
    mutationFn: (input: DeletePaymentProofCleanupInput) => deletePaymentProofs(input),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: paymentProofRetentionKeys.all }),
        client.invalidateQueries({ queryKey: reservationKeys.all }),
        client.invalidateQueries({ queryKey: historyKeys.all }),
        client.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]);
    },
  });
}
