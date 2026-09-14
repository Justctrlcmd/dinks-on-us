"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRateLimitedMutation } from "@/hooks/mutations/use-rate-limited-mutation";
import { availabilityClosureKeys, courtPricingKeys } from "@/config/query-keys";
import { closeCourtTimes, closeEntireOperation, reopenClosure } from "@/services/availability-closures/availability-closure-service";

function useRefreshAvailabilityClosures() {
  const client = useQueryClient();
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: availabilityClosureKeys.all }),
      client.invalidateQueries({ queryKey: [...courtPricingKeys.all, "reservation-options"] }),
      client.invalidateQueries({ queryKey: courtPricingKeys.closedDates() }),
    ]);
  };
}

export function useCloseEntireOperation() {
  return useRateLimitedMutation("availability-close-operation", { mutationFn: closeEntireOperation, onSuccess: useRefreshAvailabilityClosures() });
}

export function useCloseCourtTimes() {
  return useRateLimitedMutation("availability-close-court-times", { mutationFn: closeCourtTimes, onSuccess: useRefreshAvailabilityClosures() });
}

export function useReopenClosure() {
  return useRateLimitedMutation("availability-reopen", { mutationFn: reopenClosure, onSuccess: useRefreshAvailabilityClosures() });
}
