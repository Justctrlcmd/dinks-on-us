import { describe, expect, it } from "vitest";
import {
  cancelReservationSchema,
  completeReservationSchema,
  rejectReservationSchema,
  reservationAddOnsSchema,
  rescheduleReservationSchema,
} from "./reservation-management-schema";

function fileList(file?: File): FileList {
  return {
    0: file as File,
    length: file ? 1 : 0,
    item: () => file ?? null,
    [Symbol.iterator]: function* () { if (file) yield file; },
  } as FileList;
}

describe("reservation management schemas", () => {
  it("requires a concern and reason when rejecting", () => {
    const result = rejectReservationSchema.safeParse({ concern: "", reason: " " });

    expect(result.success).toBe(false);
  });

  it("allows player-only add-ons without a blank court row", () => {
    const result = reservationAddOnsSchema.safeParse({
      ranges: [{ courtId: "", slots: [] }],
      additional_players: 1,
      equipment: {},
      payment_channel: "CASH",
      payment_reference_number: "",
      payment_proof: fileList(),
    });

    expect(result.success).toBe(true);
  });

  it("allows credit-covered add-ons without payment details", () => {
    const result = reservationAddOnsSchema.safeParse({
      ranges: [{ courtId: "", slots: [] }],
      additional_players: 1,
      equipment: {},
      payment_channel: null,
      payment_reference_number: "",
      payment_proof: fileList(),
    });

    expect(result.success).toBe(true);
  });

  it("requires a configured method, reference, and proof for non-cash add-ons", () => {
    const result = reservationAddOnsSchema.safeParse({
      ranges: [{ courtId: "", slots: [] }],
      additional_players: 1,
      equipment: {},
      payment_channel: "EWALLET_BANK",
      payment_reference_number: "",
      payment_proof: fileList(),
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors).toMatchObject({
      payment_method_id: ["Choose an active e-wallet or bank payment method."],
      payment_reference_number: ["Enter the transaction reference for this payment method."],
      payment_proof: ["Select a receipt image for this payment method."],
    });
  });

  it("requires payment for a completed reservation with an outstanding balance", () => {
    const result = completeReservationSchema(true).safeParse({ payment_channel: null, payment_reference_number: "", payment_proof: fileList() });

    expect(result.success).toBe(false);
  });

  it("requires every reschedule row and a custom refund amount", () => {
    expect(rescheduleReservationSchema(1).safeParse({ date: "2026-08-28", ranges: [{ courtId: "", slots: [] }] }).success).toBe(false);
    expect(rescheduleReservationSchema(2).safeParse({ date: "2026-08-28", ranges: [{ courtId: "1", slots: ["9", "10"] }] }).success).toBe(true);
    expect(rescheduleReservationSchema(1, true).safeParse({
      date: "2026-08-28",
      ranges: [{ courtId: "1", slots: ["9"] }],
      payment_channel: "EWALLET_BANK",
      payment_method_id: 4,
      payment_reference_number: "RESCHEDULE-1",
      payment_proof: fileList(new File(["receipt"], "receipt.png", { type: "image/png" })),
    }).success).toBe(true);
    expect(cancelReservationSchema.safeParse({ reason: "Approved force majeure", refund_type: "CUSTOM", refund_amount: "" }).success).toBe(false);
  });
});
