import { authFetch } from "@/lib/api";
import type { HistoryFilters, HistoryListData, ManagementReservation } from "@/types/reservation";

export const getHistory = (filters: HistoryFilters, signal?: AbortSignal) => {
  const params = new URLSearchParams({ page: String(filters.page), per_page: "10" });
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.source) params.set("source", filters.source);
  return authFetch<HistoryListData>(`/api/v1/management/history?${params}`, { signal });
};

export const getHistoryReservation = (id: number, signal?: AbortSignal) =>
  authFetch<ManagementReservation>(`/api/v1/management/history/${id}`, { signal });
