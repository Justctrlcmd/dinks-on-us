"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  return useMutation({ mutationFn: closeEntireOperation, onSuccess: useRefreshAvailabilityClosures() });
}

export function useCloseCourtTimes() {
  return useMutation({ mutationFn: closeCourtTimes, onSuccess: useRefreshAvailabilityClosures() });
}

export function useReopenClosure() {
  return useMutation({ mutationFn: reopenClosure, onSuccess: useRefreshAvailabilityClosures() });
}
