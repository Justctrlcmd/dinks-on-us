"use client";

import { useQuery } from "@tanstack/react-query";
import { historyKeys } from "@/config/query-keys";
import { getHistory, getHistoryReservation } from "@/services/history/history-service";
import type { HistoryFilters } from "@/types/reservation";

export function useHistory(filters: HistoryFilters) {
  return useQuery({
    queryKey: historyKeys.list(filters),
    queryFn: ({ signal }) => getHistory(filters, signal),
    placeholderData: (previous) => previous,
  });
}

export function useHistoryReservation(id: number | null) {
  return useQuery({
    queryKey: historyKeys.detail(id ?? 0),
    queryFn: ({ signal }) => getHistoryReservation(id as number, signal).then((response) => response.data),
    enabled: id !== null,
  });
}
