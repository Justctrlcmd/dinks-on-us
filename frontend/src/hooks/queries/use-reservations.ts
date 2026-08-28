"use client";

import { useQuery } from "@tanstack/react-query";
import { reservationKeys } from "@/config/query-keys";
import { getReservation, getReservations } from "@/services/reservations/reservation-service";
import type { ReservationFilters } from "@/types/reservation";

export function useReservations(filters: ReservationFilters) {
  return useQuery({ queryKey: reservationKeys.list(filters), queryFn: ({ signal }) => getReservations(filters, signal), placeholderData: (previous) => previous });
}

export function usePendingReservationCount(enabled = true) {
  return useQuery({
    queryKey: reservationKeys.pendingCount(),
    queryFn: ({ signal }) => getReservations({ page: 1, search: "", status: "PENDING" }, signal).then((response) => response.meta?.total ?? response.data.kpis.pending),
    enabled,
    staleTime: 30_000,
    refetchInterval: enabled ? 30_000 : false,
  });
}

export function useReservation(id: number | null) {
  return useQuery({ queryKey: reservationKeys.detail(id ?? 0), queryFn: ({ signal }) => getReservation(id as number, signal).then((response) => response.data), enabled: id !== null });
}
