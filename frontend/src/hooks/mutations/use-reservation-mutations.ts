"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { courtPricingKeys, dashboardKeys, reservationKeys } from "@/config/query-keys";
import { addReservationAddOns, cancelReservation, completeReservation, createWalkInReservation, noShowReservation, rejectReservation, rescheduleReservation, startReservation, submitReservation, verifyReservation } from "@/services/reservations/reservation-service";

function useReservationAction<T>(mutationFn: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => { client.invalidateQueries({ queryKey: reservationKeys.all }); client.invalidateQueries({ queryKey: dashboardKeys.all }); client.invalidateQueries({ queryKey: [...courtPricingKeys.all, "reservation-options"] }); } });
}

export function useSubmitReservation() {
  const client = useQueryClient();
  return useMutation({ mutationFn: submitReservation, onSuccess: () => { client.invalidateQueries({ queryKey: dashboardKeys.all }); client.invalidateQueries({ queryKey: [...courtPricingKeys.all, "reservation-options"] }); } });
}
export const useCreateWalkInReservation = () => useReservationAction<Parameters<typeof createWalkInReservation>[0]>(createWalkInReservation);
export const useVerifyReservation = () => useReservationAction<number>(verifyReservation);
export const useStartReservation = () => useReservationAction<number>(startReservation);
export const useNoShowReservation = () => useReservationAction<number>(noShowReservation);
export const useRejectReservation = () => useReservationAction<{ id: number; concern: string; reason: string }>(({ id, ...input }) => rejectReservation(id, input));
export const useRescheduleReservation = () => useReservationAction<{ id: number; slots: Parameters<typeof rescheduleReservation>[1] }>(({ id, slots }) => rescheduleReservation(id, slots));
export const useAddReservationAddOns = () => useReservationAction<{ id: number; input: Parameters<typeof addReservationAddOns>[1] }>(({ id, input }) => addReservationAddOns(id, input));
export const useCancelReservation = () => useReservationAction<{ id: number; input: Parameters<typeof cancelReservation>[1] }>(({ id, input }) => cancelReservation(id, input));
export const useCompleteReservation = () => useReservationAction<{ id: number; input: FormData }>(({ id, input }) => completeReservation(id, input));
