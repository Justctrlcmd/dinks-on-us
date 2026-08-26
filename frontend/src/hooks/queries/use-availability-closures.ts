"use client";

import { useQuery } from "@tanstack/react-query";
import { availabilityClosureKeys } from "@/config/query-keys";
import { getAvailabilityActivity, getAvailabilityClosures } from "@/services/availability-closures/availability-closure-service";

export function useAvailabilityClosures(page: number) {
  return useQuery({
    queryKey: availabilityClosureKeys.closures(page),
    queryFn: ({ signal }) => getAvailabilityClosures(page, signal),
  });
}

export function useAvailabilityActivity(page: number) {
  return useQuery({
    queryKey: availabilityClosureKeys.activity(page),
    queryFn: ({ signal }) => getAvailabilityActivity(page, signal),
  });
}
