import { authFetch, publicFetch } from "@/lib/api";
import type { ApiResponse } from "@/types/api";
import type { ManagementReservation, PendingReservationSummary, ReservationAddOnsInput, ReservationFilters, ReservationListData, RescheduleReservationInput, WalkInReservationInput } from "@/types/reservation";

export const submitReservation = ({ input, idempotencyKey }: { input: FormData; idempotencyKey: string }) =>
  publicFetch<ManagementReservation>("/api/v1/public/reservations", {
    method: "POST",
    csrf: true,
    headers: { "Idempotency-Key": idempotencyKey },
    body: input,
  });

export const getReservations = (filters: ReservationFilters, signal?: AbortSignal) => {
  const params = new URLSearchParams({ page: String(filters.page), per_page: "10" });
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.status) params.set("status", filters.status);
  return authFetch<ReservationListData>(`/api/v1/management/reservations?${params}`, { signal });
};

export const getPendingReservationSummary = (signal?: AbortSignal) =>
  authFetch<PendingReservationSummary>("/api/v1/management/reservations/pending-summary", { signal });

export const getReservation = (id: number, signal?: AbortSignal) =>
  authFetch<ManagementReservation>(`/api/v1/management/reservations/${id}`, { signal });

export const createWalkInReservation = (input: WalkInReservationInput, idempotencyKey?: string) => {
  const body = new FormData();
  if (input.quoted_amount !== undefined) body.set("quoted_amount", input.quoted_amount.toFixed(2));
  body.set("customer_name", input.customer_name);
  body.set("customer_email", input.customer_email);
  body.set("customer_contact_number", input.customer_contact_number);
  body.set("additional_players", String(input.additional_players));
  if (input.payment_channel) body.set("payment_channel", input.payment_channel);
  if (input.payment_method_id !== undefined) body.set("payment_method_id", String(input.payment_method_id));
  if (input.payment_reference_number?.trim()) body.set("payment_reference_number", input.payment_reference_number.trim());
  if (input.payment_proof) body.set("payment_proof", input.payment_proof);
  input.slots.forEach((slot, index) => {
    body.set(`slots[${index}][court_id]`, String(slot.court_id));
    body.set(`slots[${index}][date]`, slot.date);
    body.set(`slots[${index}][start_hour]`, String(slot.start_hour));
  });
  input.equipment.forEach((item, index) => {
    body.set(`equipment[${index}][id]`, String(item.id));
    body.set(`equipment[${index}][quantity]`, String(item.quantity));
  });
  return authFetch<ManagementReservation>("/api/v1/management/reservations/walk-in", { method: "POST", csrf: true, body, headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined });
};

const postAction = (id: number, action: string, body?: BodyInit, idempotencyKey?: string): Promise<ApiResponse<ManagementReservation>> =>
  authFetch<ManagementReservation>(`/api/v1/management/reservations/${id}/${action}`, { method: "POST", csrf: true, body, headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined });

export const verifyReservation = (id: number, key?: string) => postAction(id, "verify", undefined, key);
export const startReservation = (id: number, key?: string) => postAction(id, "start", undefined, key);
export const noShowReservation = (id: number, key?: string) => postAction(id, "no-show", undefined, key);
export const rejectReservation = (id: number, input: { concern: string; reason: string }, key?: string) => postAction(id, "reject", JSON.stringify(input), key);
export const rescheduleReservation = (id: number, input: RescheduleReservationInput, key?: string) => {
  const body = new FormData();
  if (input.expected_revision !== undefined) body.set("expected_revision", String(input.expected_revision));
  if (input.quoted_amount !== undefined) body.set("quoted_amount", input.quoted_amount.toFixed(2));
  if (input.quoted_payment_amount !== undefined) body.set("quoted_payment_amount", input.quoted_payment_amount.toFixed(2));
  if (input.quoted_refund_amount !== undefined) body.set("quoted_refund_amount", input.quoted_refund_amount.toFixed(2));
  if (input.refund_settled !== undefined) body.set("refund_settled", input.refund_settled ? "1" : "0");
  input.slots.forEach((slot, index) => {
    body.set(`slots[${index}][court_id]`, String(slot.court_id));
    body.set(`slots[${index}][date]`, slot.date);
    body.set(`slots[${index}][start_hour]`, String(slot.start_hour));
  });
  input.add_on_slots?.forEach((slot, index) => {
    body.set(`add_on_slots[${index}][court_id]`, String(slot.court_id));
    body.set(`add_on_slots[${index}][date]`, slot.date);
    body.set(`add_on_slots[${index}][start_hour]`, String(slot.start_hour));
  });
  if (input.additional_players !== undefined) body.set("additional_players", String(input.additional_players));
  input.equipment?.forEach((item, index) => {
    body.set(`equipment[${index}][id]`, String(item.id));
    body.set(`equipment[${index}][quantity]`, String(item.quantity));
  });
  if (input.payment_channel) body.set("payment_channel", input.payment_channel);
  if (input.payment_method_id !== undefined) body.set("payment_method_id", String(input.payment_method_id));
  if (input.payment_reference_number?.trim()) body.set("payment_reference_number", input.payment_reference_number.trim());
  if (input.payment_proof) body.set("payment_proof", input.payment_proof);
  return postAction(id, "reschedule", body, key);
};
export const addReservationAddOns = (id: number, input: ReservationAddOnsInput, key?: string) => {
  const body = new FormData();
  if (input.expected_revision !== undefined) body.set("expected_revision", String(input.expected_revision));
  if (input.quoted_amount !== undefined) body.set("quoted_amount", input.quoted_amount.toFixed(2));
  if (input.quoted_payment_amount !== undefined) body.set("quoted_payment_amount", input.quoted_payment_amount.toFixed(2));
  input.slots?.forEach((slot, index) => {
    body.set("slots[" + index + "][court_id]", String(slot.court_id));
    body.set("slots[" + index + "][date]", slot.date);
    body.set("slots[" + index + "][start_hour]", String(slot.start_hour));
  });
  if (input.additional_players !== undefined) body.set("additional_players", String(input.additional_players));
  input.equipment?.forEach((item, index) => {
    body.set("equipment[" + index + "][id]", String(item.id));
    body.set("equipment[" + index + "][quantity]", String(item.quantity));
  });
  if (input.payment_channel) body.set("payment_channel", input.payment_channel);
  if (input.payment_method_id !== undefined) body.set("payment_method_id", String(input.payment_method_id));
  if (input.payment_reference_number?.trim()) body.set("payment_reference_number", input.payment_reference_number.trim());
  if (input.payment_proof) body.set("payment_proof", input.payment_proof);
  return postAction(id, "add-ons", body, key);
};
export const cancelReservation = (id: number, input: { reason: string; refund_type: "FULL" | "CUSTOM"; refund_amount?: number; quoted_refund_amount?: number; expected_revision?: number }, key?: string) => postAction(id, "cancel", JSON.stringify(input), key);
export const completeReservation = (id: number, input: FormData, key?: string) => postAction(id, "complete", input, key);

export function reservationProofUrl(path: string): string {
  return `/backend${path}`;
}
