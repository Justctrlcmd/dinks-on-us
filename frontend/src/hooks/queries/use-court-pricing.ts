"use client";

import { useQuery } from "@tanstack/react-query";
import { courtPricingKeys } from "@/config/query-keys";
import { getCourtPricingManagement, getReservationClosedDates, getReservationOptions } from "@/services/court-pricing/court-pricing-service";

export function useCourtPricingManagement() {
  return useQuery({
    queryKey: courtPricingKeys.management(),
    queryFn: ({ signal }) => getCourtPricingManagement(signal),
  });
}

export function useReservationOptions(date: string, hours: number[] = []) {
  const selectedHours = [...new Set(hours)].sort((left, right) => left - right);
  return useQuery({
    queryKey: courtPricingKeys.reservationOptions(date, selectedHours),
    queryFn: ({ signal }) => getReservationOptions(date, signal, selectedHours).then((response) => response.data),
    placeholderData: (previous) => previous?.date === date ? previous : undefined,
    staleTime: 0,
    refetchInterval: 30_000,
    enabled: Boolean(date),
  });
}

export function useReservationClosedDates() {
  return useQuery({
    queryKey: courtPricingKeys.closedDates(),
    queryFn: ({ signal }) => getReservationClosedDates(signal).then((response) => response.data.closed_dates),
    staleTime: 30_000,
  });
}
