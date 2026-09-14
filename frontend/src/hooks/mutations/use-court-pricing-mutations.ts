"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRateLimitedMutation } from "@/hooks/mutations/use-rate-limited-mutation";
import { courtPricingKeys } from "@/config/query-keys";
import {
  createCourt,
  createRentalEquipment,
  deleteCourt,
  deleteRentalEquipment,
  updateCourtConfiguration,
  updateRentalEquipment,
} from "@/services/court-pricing/court-pricing-service";

function useRefreshCourtPricing() {
  const client = useQueryClient();
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: courtPricingKeys.management() }),
      client.invalidateQueries({ queryKey: [...courtPricingKeys.all, "reservation-options"] }),
    ]);
  };
}

export function useUpdateCourtConfiguration() {
  return useRateLimitedMutation("court-configuration", { mutationFn: updateCourtConfiguration, onSuccess: useRefreshCourtPricing() });
}

export function useCreateCourt() {
  return useRateLimitedMutation("court-create", { mutationFn: createCourt, onSuccess: useRefreshCourtPricing() });
}

export function useDeleteCourt() {
  return useRateLimitedMutation("court-delete", { mutationFn: deleteCourt, onSuccess: useRefreshCourtPricing() });
}

export function useCreateRentalEquipment() {
  return useRateLimitedMutation("rental-equipment-create", { mutationFn: createRentalEquipment, onSuccess: useRefreshCourtPricing() });
}

export function useUpdateRentalEquipment() {
  return useRateLimitedMutation("rental-equipment-update", { mutationFn: updateRentalEquipment, onSuccess: useRefreshCourtPricing() });
}

export function useDeleteRentalEquipment() {
  return useRateLimitedMutation("rental-equipment-delete", { mutationFn: deleteRentalEquipment, onSuccess: useRefreshCourtPricing() });
}
