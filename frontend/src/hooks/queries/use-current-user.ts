"use client";

import { useQuery } from "@tanstack/react-query";
import { authKeys } from "@/config/query-keys";
import { getCurrentUser } from "@/services/auth/auth-service";

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: ({ signal }) => getCurrentUser(signal).then((response) => response.data),
    retry: false,
    staleTime: 60_000,
  });
}
