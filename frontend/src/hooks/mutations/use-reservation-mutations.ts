"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRateLimitedMutation } from "@/hooks/mutations/use-rate-limited-mutation";
import { courtPricingKeys, dashboardKeys, reservationKeys } from "@/config/query-keys";
import { addReservationAddOns, cancelReservation, completeReservation, createWalkInReservation, noShowReservation, rejectReservation, rescheduleReservation, startReservation, submitReservation, verifyReservation } from "@/services/reservations/reservation-service";
import type { RescheduleReservationInput } from "@/types/reservation";

function useReservationAction<T>(rateLimitKey: string, mutationFn: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useRateLimitedMutation(rateLimitKey, { mutationFn, onSuccess: () => { client.invalidateQueries({ queryKey: reservationKeys.all }); client.invalidateQueries({ queryKey: dashboardKeys.all }); client.invalidateQueries({ queryKey: [...courtPricingKeys.all, "reservation-options"] }); } });
}

export function useSubmitReservation() {
  const client = useQueryClient();
  return useRateLimitedMutation("reservation-submit", { mutationFn: submitReservation, onSuccess: () => { client.invalidateQueries({ queryKey: dashboardKeys.all }); client.invalidateQueries({ queryKey: [...courtPricingKeys.all, "reservation-options"] }); } });
}
export const useCreateWalkInReservation = () => useReservationAction<Parameters<typeof createWalkInReservation>[0]>("reservation-walk-in", createWalkInReservation);
export const useVerifyReservation = () => useReservationAction<number>("reservation-verify", verifyReservation);
export const useStartReservation = () => useReservationAction<number>("reservation-start", startReservation);
export const useNoShowReservation = () => useReservationAction<number>("reservation-no-show", noShowReservation);
export const useRejectReservation = () => useReservationAction<{ id: number; concern: string; reason: string }>("reservation-reject", ({ id, ...input }) => rejectReservation(id, input));
export const useRescheduleReservation = () => useReservationAction<{ id: number; input: RescheduleReservationInput }>("reservation-reschedule", ({ id, input }) => rescheduleReservation(id, input));
export const useAddReservationAddOns = () => useReservationAction<{ id: number; input: Parameters<typeof addReservationAddOns>[1] }>("reservation-add-ons", ({ id, input }) => addReservationAddOns(id, input));
export const useCancelReservation = () => useReservationAction<{ id: number; input: Parameters<typeof cancelReservation>[1] }>("reservation-cancel", ({ id, input }) => cancelReservation(id, input));
export const useCompleteReservation = () => useReservationAction<{ id: number; input: FormData }>("reservation-complete", ({ id, input }) => completeReservation(id, input));
