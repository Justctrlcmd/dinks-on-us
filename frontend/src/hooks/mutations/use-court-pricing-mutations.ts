"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  return useMutation({ mutationFn: updateCourtConfiguration, onSuccess: useRefreshCourtPricing() });
}

export function useCreateCourt() {
  return useMutation({ mutationFn: createCourt, onSuccess: useRefreshCourtPricing() });
}

export function useDeleteCourt() {
  return useMutation({ mutationFn: deleteCourt, onSuccess: useRefreshCourtPricing() });
}

export function useCreateRentalEquipment() {
  return useMutation({ mutationFn: createRentalEquipment, onSuccess: useRefreshCourtPricing() });
}

export function useUpdateRentalEquipment() {
  return useMutation({ mutationFn: updateRentalEquipment, onSuccess: useRefreshCourtPricing() });
}

export function useDeleteRentalEquipment() {
  return useMutation({ mutationFn: deleteRentalEquipment, onSuccess: useRefreshCourtPricing() });
}
