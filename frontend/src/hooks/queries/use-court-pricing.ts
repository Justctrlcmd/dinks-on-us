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

export function useReservationOptions(date: string) {
  return useQuery({
    queryKey: courtPricingKeys.reservationOptions(date),
    queryFn: ({ signal }) => getReservationOptions(date, signal).then((response) => response.data),
    staleTime: 30_000,
  });
}

export function useReservationClosedDates() {
  return useQuery({
    queryKey: courtPricingKeys.closedDates(),
    queryFn: ({ signal }) => getReservationClosedDates(signal).then((response) => response.data.closed_dates),
    staleTime: 30_000,
  });
}
