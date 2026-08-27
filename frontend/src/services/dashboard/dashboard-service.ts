import { authFetch } from "@/lib/api";
import type { DashboardData } from "@/types/dashboard";
import type { ManagementReservation } from "@/types/reservation";

export function getDashboard(weekStart: string, date: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ week_start: weekStart, date });
  return authFetch<DashboardData>(`/api/v1/management/dashboard?${params}`, { signal });
}

export const getDashboardReservation = (id: number, signal?: AbortSignal) =>
  authFetch<ManagementReservation>(`/api/v1/management/dashboard/reservations/${id}`, { signal });
