"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dashboardKeys, historyKeys, paymentProofRetentionKeys, reservationKeys } from "@/config/query-keys";
import { deletePaymentProofs } from "@/services/payment-proof-retention/payment-proof-retention-service";
import type { DeletePaymentProofCleanupInput } from "@/types/payment-proof-retention";

export function useDeletePaymentProofs() {
  const client = useQueryClient();

  return useMutation({
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
