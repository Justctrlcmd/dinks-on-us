import { authFetch } from "@/lib/api";
import type { ActionLog, ActionLogFilters, PaginatedActionLogs } from "@/types/action-logs";

export async function getActionLogs(filters: ActionLogFilters, signal?: AbortSignal): Promise<PaginatedActionLogs> {
  const params = new URLSearchParams({ page: String(filters.page), per_page: "10" });
  if (filters.search) params.set("search", filters.search);
  if (filters.module) params.set("module", filters.module);
  if (filters.date) params.set("date", filters.date);
  const response = await authFetch<ActionLog[]>(`/api/v1/management/action-logs?${params}`, { signal });
  return { data: response.data, meta: response.meta! };
}
