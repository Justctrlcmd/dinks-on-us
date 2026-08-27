"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardKeys } from "@/config/query-keys";
import { getDashboard, getDashboardReservation } from "@/services/dashboard/dashboard-service";

export function useDashboard(weekStart: string, date: string) {
  return useQuery({
    queryKey: dashboardKeys.overview(weekStart, date),
    queryFn: ({ signal }) => getDashboard(weekStart, date, signal).then((response) => response.data),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });
}

export function useDashboardReservation(id: number | null) {
  return useQuery({
    queryKey: dashboardKeys.reservation(id ?? 0),
    queryFn: ({ signal }) => getDashboardReservation(id as number, signal).then((response) => response.data),
    enabled: id !== null,
  });
}
