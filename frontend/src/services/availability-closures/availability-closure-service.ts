import { authFetch } from "@/lib/api";
import type {
  AvailabilityActivity,
  AvailabilityClosure,
  CourtTimeClosureInput,
  PaginatedAvailabilityActivity,
  PaginatedAvailabilityClosures,
  WholeOperationClosureInput,
} from "@/types/availability-closures";

export async function getAvailabilityClosures(page: number, signal?: AbortSignal): Promise<PaginatedAvailabilityClosures> {
  const response = await authFetch<AvailabilityClosure[]>(`/api/v1/management/availability-closures?page=${page}`, { signal });
  return { data: response.data, meta: response.meta! };
}

export async function getAvailabilityActivity(page: number, signal?: AbortSignal): Promise<PaginatedAvailabilityActivity> {
  const response = await authFetch<AvailabilityActivity[]>(`/api/v1/management/availability-activity?page=${page}`, { signal });
  return { data: response.data, meta: response.meta! };
}

export const closeEntireOperation = (input: WholeOperationClosureInput) =>
  authFetch<AvailabilityClosure>("/api/v1/management/closed-dates", {
    method: "POST",
    csrf: true,
    body: JSON.stringify(input),
  });

export const closeCourtTimes = (input: CourtTimeClosureInput) =>
  authFetch<AvailabilityClosure>("/api/v1/management/availability-blocks", {
    method: "POST",
    csrf: true,
    body: JSON.stringify(input),
  });

export function reopenClosure(closure: AvailabilityClosure) {
  const path = closure.type === "entire_operation"
    ? `/api/v1/management/closed-dates/${closure.id}`
    : `/api/v1/management/availability-blocks/${closure.id}`;

  return authFetch<AvailabilityClosure>(path, { method: "DELETE", csrf: true });
}
