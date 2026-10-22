"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRateLimitedMutation } from "@/hooks/mutations/use-rate-limited-mutation";
import { actionLogKeys, authKeys, courtPricingKeys, dashboardKeys, historyKeys, reportKeys, reservationKeys } from "@/config/query-keys";
import { addReservationAddOns, cancelReservation, completeReservation, createWalkInReservation, noShowReservation, rejectReservation, rescheduleReservation, startReservation, submitReservation, verifyReservation } from "@/services/reservations/reservation-service";
import type { RescheduleReservationInput } from "@/types/reservation";
import type { ManagementReservation } from "@/types/reservation";
import { reservationRequestKey } from "@/lib/reservation-request-key";
import { isApiError } from "@/lib/api";
import type { ApiResponse } from "@/types/api";

function useReservationAction<T>(rateLimitKey: string, mutationFn: (input: T, key: string) => Promise<ApiResponse<ManagementReservation>>, onCommitted?: () => void) {
  const client = useQueryClient();
  return useRateLimitedMutation(rateLimitKey, { mutationFn: async (input: T) => {
    const actor = client.getQueryData<{ id: number }>(authKeys.currentUser())?.id;
    const attempt = await reservationRequestKey(rateLimitKey, actor, input);
    try {
      const response = await mutationFn(input, attempt.key);
      attempt.release();
      return response;
    } catch (error) {
      // Even a later validation/auth/throttle response cannot prove that an
      // earlier ambiguous attempt failed. Keep the key until success or an
      // explicit changed-request conflict that exits the old confirmation.
      if (isApiError(error) && error.code === "RESERVATION_REQUEST_KEY_REUSED") attempt.release();
      throw error;
    }
  }, onSuccess: async (response) => {
    // Close the originating dialog before seeding detail data can remount its
    // form and detach per-call callbacks. Related screens still refresh below.
    onCommitted?.();
    const detailKey = reservationKeys.detail(response.data.id);
    await client.cancelQueries({ queryKey: detailKey });
    client.setQueryData(detailKey, response.data);
    await Promise.all([
      client.invalidateQueries({ queryKey: reservationKeys.all }),
      client.invalidateQueries({ queryKey: dashboardKeys.all }),
      client.invalidateQueries({ queryKey: historyKeys.all }),
      client.invalidateQueries({ queryKey: reportKeys.all }),
      client.invalidateQueries({ queryKey: actionLogKeys.all }),
      client.invalidateQueries({ queryKey: [...courtPricingKeys.all, "reservation-options"] }),
    ]);
  }, onError: async (error) => {
    if (isApiError(error) && error.code === "RESERVATION_REQUEST_KEY_REUSED") {
      await Promise.all([reservationKeys.all, dashboardKeys.all, historyKeys.all, reportKeys.all, actionLogKeys.all, [...courtPricingKeys.all, "reservation-options"]].map((queryKey) => client.invalidateQueries({ queryKey })));
    }
    if (isApiError(error) && error.code === "RESERVATION_REVIEW_CHANGED") {
      await Promise.all([
        client.invalidateQueries({ queryKey: reservationKeys.all }),
        client.invalidateQueries({ queryKey: [...courtPricingKeys.all, "reservation-options"] }),
      ]);
    }
  } });
}

export function useSubmitReservation() {
  const client = useQueryClient();
  return useRateLimitedMutation("reservation-submit", { mutationFn: submitReservation, onSuccess: async () => { await Promise.all([
    client.invalidateQueries({ queryKey: reservationKeys.all }),
    client.invalidateQueries({ queryKey: dashboardKeys.all }),
    client.invalidateQueries({ queryKey: reportKeys.all }),
    client.invalidateQueries({ queryKey: [...courtPricingKeys.all, "reservation-options"] }),
  ]); } });
}
export const useCreateWalkInReservation = () => useReservationAction<Parameters<typeof createWalkInReservation>[0]>("reservation-walk-in", (input, key) => createWalkInReservation(input, key));
export const useVerifyReservation = () => useReservationAction<number>("reservation-verify", (id, key) => verifyReservation(id, key));
export const useStartReservation = () => useReservationAction<number>("reservation-start", (id, key) => startReservation(id, key));
export const useNoShowReservation = () => useReservationAction<number>("reservation-no-show", (id, key) => noShowReservation(id, key));
export const useRejectReservation = () => useReservationAction<{ id: number; concern: string; reason: string }>("reservation-reject", ({ id, ...input }, key) => rejectReservation(id, input, key));
export const useRescheduleReservation = (onCommitted?: () => void) => useReservationAction<{ id: number; input: RescheduleReservationInput }>("reservation-reschedule", ({ id, input }, key) => rescheduleReservation(id, input, key), onCommitted);
export const useAddReservationAddOns = (onCommitted?: () => void) => useReservationAction<{ id: number; input: Parameters<typeof addReservationAddOns>[1] }>("reservation-add-ons", ({ id, input }, key) => addReservationAddOns(id, input, key), onCommitted);
export const useCancelReservation = (onCommitted?: () => void) => useReservationAction<{ id: number; input: Parameters<typeof cancelReservation>[1] }>("reservation-cancel", ({ id, input }, key) => cancelReservation(id, input, key), onCommitted);
export const useCompleteReservation = (onCommitted?: () => void) => useReservationAction<{ id: number; input: FormData }>("reservation-complete", ({ id, input }, key) => completeReservation(id, input, key), onCommitted);
