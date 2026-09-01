import { describe, expect, it } from "vitest";
import { walkInReservationSchema } from "./walk-in-reservation-schema";

const baseValues = {
  customer_name: "Maria Walk In",
  customer_email: "maria@example.com",
  customer_contact_number: "09171234567",
  date: "2026-09-06",
  slots: [{ court_id: 1, date: "2026-09-06", start_hour: 9 }],
  equipment: [],
  additional_players: 0,
  payment_channel: "CASH" as const,
  payment_reference_number: "",
};

describe("walkInReservationSchema", () => {
  it("allows cash without a configured method, reference, or proof", () => {
    expect(walkInReservationSchema.safeParse(baseValues).success).toBe(true);
  });

  it("requires a configured method, reference, and receipt for non-cash payments", () => {
    const result = walkInReservationSchema.safeParse({ ...baseValues, payment_channel: "EWALLET_BANK" });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors).toMatchObject({
      payment_method_id: ["Choose an active e-wallet or bank payment method."],
      payment_reference_number: ["Enter the transaction reference for this payment method."],
      payment_proof: ["Select a receipt image for this payment method."],
    });
  });

  it("accepts complete evidence for a configured non-cash method", () => {
    const proof = new File(["receipt"], "receipt.png", { type: "image/png" });
    const paymentProof = { 0: proof, length: 1, item: () => proof } as unknown as FileList;

    expect(walkInReservationSchema.safeParse({
      ...baseValues,
      payment_channel: "EWALLET_BANK",
      payment_method_id: 7,
      payment_reference_number: "GCASH-1001",
      payment_proof: paymentProof,
    }).success).toBe(true);
  });
});
