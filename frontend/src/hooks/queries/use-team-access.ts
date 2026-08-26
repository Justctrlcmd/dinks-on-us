"use client";

import { useQuery } from "@tanstack/react-query";
import { teamAccessKeys } from "@/config/query-keys";
import { getAccessOverview, getTeam } from "@/services/team-access/team-access-service";

export function useAccessOverview() {
  return useQuery({
    queryKey: teamAccessKeys.accesses(),
    queryFn: ({ signal }) => getAccessOverview(signal).then((response) => response.data),
  });
}

export function useTeam(page: number) {
  return useQuery({
    queryKey: teamAccessKeys.team(page),
    queryFn: ({ signal }) => getTeam(page, signal).then((response) => ({
      data: response.data,
      meta: response.meta!,
    })),
  });
}
