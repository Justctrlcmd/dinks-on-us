import { authFetch, publicFetch } from "@/lib/api";
import type { ApiResponse } from "@/types/api";
import type { ManagementReservation, ReservationAddOnsInput, ReservationFilters, ReservationListData, SlotInput, WalkInReservationInput } from "@/types/reservation";

export const submitReservation = (input: FormData) =>
  publicFetch<ManagementReservation>("/api/v1/public/reservations", { method: "POST", csrf: true, body: input });

export const getReservations = (filters: ReservationFilters, signal?: AbortSignal) => {
  const params = new URLSearchParams({ page: String(filters.page), per_page: "10" });
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.status) params.set("status", filters.status);
  return authFetch<ReservationListData>(`/api/v1/management/reservations?${params}`, { signal });
};

export const getReservation = (id: number, signal?: AbortSignal) =>
  authFetch<ManagementReservation>(`/api/v1/management/reservations/${id}`, { signal });

export const createWalkInReservation = (input: WalkInReservationInput) => {
  const body = new FormData();
  body.set("customer_name", input.customer_name);
  body.set("customer_email", input.customer_email);
  body.set("customer_contact_number", input.customer_contact_number);
  body.set("additional_players", String(input.additional_players));
  body.set("payment_channel", input.payment_channel);
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
  return authFetch<ManagementReservation>("/api/v1/management/reservations/walk-in", { method: "POST", csrf: true, body });
};

const postAction = (id: number, action: string, body?: BodyInit): Promise<ApiResponse<ManagementReservation>> =>
  authFetch<ManagementReservation>(`/api/v1/management/reservations/${id}/${action}`, { method: "POST", csrf: true, body });

export const verifyReservation = (id: number) => postAction(id, "verify");
export const startReservation = (id: number) => postAction(id, "start");
export const noShowReservation = (id: number) => postAction(id, "no-show");
export const rejectReservation = (id: number, input: { concern: string; reason: string }) => postAction(id, "reject", JSON.stringify(input));
export const rescheduleReservation = (id: number, slots: SlotInput[]) => postAction(id, "reschedule", JSON.stringify({ slots }));
export const addReservationAddOns = (id: number, input: ReservationAddOnsInput) => {
  const body = new FormData();
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
  body.set("payment_channel", input.payment_channel);
  if (input.payment_reference_number?.trim()) body.set("payment_reference_number", input.payment_reference_number.trim());
  if (input.payment_proof) body.set("payment_proof", input.payment_proof);
  return postAction(id, "add-ons", body);
};
export const cancelReservation = (id: number, input: { reason: string; refund_type: "FULL" | "CUSTOM"; refund_amount?: number }) => postAction(id, "cancel", JSON.stringify(input));
export const completeReservation = (id: number, input: FormData) => postAction(id, "complete", input);

export function reservationProofUrl(path: string): string {
  const root = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  return `${root}${path}`;
}
