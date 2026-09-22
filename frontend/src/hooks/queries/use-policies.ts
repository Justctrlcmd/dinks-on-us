"use client";

import { useQuery } from "@tanstack/react-query";
import { policyKeys } from "@/config/query-keys";
import { getManagementPolicies, getPublicPolicies } from "@/services/policy/policy-service";
import type { PolicySection } from "@/types/policy";

export function usePublicPolicies(initialData?: PolicySection[]) {
  return useQuery({
    queryKey: policyKeys.public(),
    queryFn: ({ signal }) => getPublicPolicies(signal).then((response) => response.data),
    initialData,
    staleTime: 60_000,
  });
}

export function useManagementPolicies() {
  return useQuery({
    queryKey: policyKeys.management(),
    queryFn: ({ signal }) => getManagementPolicies(signal).then((response) => response.data),
  });
}
