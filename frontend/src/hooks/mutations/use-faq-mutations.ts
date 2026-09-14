"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRateLimitedMutation } from "@/hooks/mutations/use-rate-limited-mutation";
import { faqKeys } from "@/config/query-keys";
import { createFaq, deleteFaq, updateFaq, updateFaqOrder } from "@/services/faq/faq-service";

function useRefreshFaqs() {
  const client = useQueryClient();

  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: faqKeys.management() }),
      client.invalidateQueries({ queryKey: faqKeys.public() }),
    ]);
  };
}

export function useCreateFaq() {
  const refresh = useRefreshFaqs();
  return useRateLimitedMutation("faq-create", { mutationFn: createFaq, onSuccess: refresh });
}

export function useUpdateFaq() {
  const refresh = useRefreshFaqs();
  return useRateLimitedMutation("faq-update", { mutationFn: updateFaq, onSuccess: refresh });
}

export function useDeleteFaq() {
  const refresh = useRefreshFaqs();
  return useRateLimitedMutation("faq-delete", { mutationFn: deleteFaq, onSuccess: refresh });
}

export function useUpdateFaqOrder() {
  const client = useQueryClient();

  return useRateLimitedMutation("faq-order", {
    mutationFn: updateFaqOrder,
    onSuccess: (response) => {
      client.setQueryData(faqKeys.management(), response.data);
      void client.invalidateQueries({ queryKey: faqKeys.public() });
    },
  });
}
