"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  return useMutation({ mutationFn: createFaq, onSuccess: refresh });
}

export function useUpdateFaq() {
  const refresh = useRefreshFaqs();
  return useMutation({ mutationFn: updateFaq, onSuccess: refresh });
}

export function useDeleteFaq() {
  const refresh = useRefreshFaqs();
  return useMutation({ mutationFn: deleteFaq, onSuccess: refresh });
}

export function useUpdateFaqOrder() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: updateFaqOrder,
    onSuccess: (response) => {
      client.setQueryData(faqKeys.management(), response.data);
      void client.invalidateQueries({ queryKey: faqKeys.public() });
    },
  });
}
