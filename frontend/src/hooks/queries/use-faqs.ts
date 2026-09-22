"use client";

import { useQuery } from "@tanstack/react-query";
import { faqKeys } from "@/config/query-keys";
import { getManagementFaqs, getPublicFaqs } from "@/services/faq/faq-service";
import type { Faq } from "@/types/faq";

export function usePublicFaqs(initialData?: Faq[]) {
  return useQuery({
    queryKey: faqKeys.public(),
    queryFn: ({ signal }) => getPublicFaqs(signal).then((response) => response.data),
    initialData,
    staleTime: 60_000,
  });
}

export function useManagementFaqs() {
  return useQuery({
    queryKey: faqKeys.management(),
    queryFn: ({ signal }) => getManagementFaqs(signal).then((response) => response.data),
  });
}
