"use client";

import { useQuery } from "@tanstack/react-query";
import { faqKeys } from "@/config/query-keys";
import { getManagementFaqs, getPublicFaqs } from "@/services/faq/faq-service";

export function usePublicFaqs() {
  return useQuery({
    queryKey: faqKeys.public(),
    queryFn: ({ signal }) => getPublicFaqs(signal).then((response) => response.data),
    staleTime: 60_000,
  });
}

export function useManagementFaqs() {
  return useQuery({
    queryKey: faqKeys.management(),
    queryFn: ({ signal }) => getManagementFaqs(signal).then((response) => response.data),
  });
}
