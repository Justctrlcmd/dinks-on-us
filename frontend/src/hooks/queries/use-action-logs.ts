"use client";

import { useQuery } from "@tanstack/react-query";
import { actionLogKeys } from "@/config/query-keys";
import { getActionLogs } from "@/services/action-logs/action-log-service";
import type { ActionLogFilters } from "@/types/action-logs";

export function useActionLogs(filters: ActionLogFilters) {
  return useQuery({
    queryKey: actionLogKeys.list(filters),
    queryFn: ({ signal }) => getActionLogs(filters, signal),
  });
}
