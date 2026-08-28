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
      ranges: [{ courtId: "", slot: "" }],
      additional_players: 1,
      equipment: {},
      payment_channel: "CASH",
      payment_reference_number: "",
      payment_proof: fileList(),
    });

    expect(result.success).toBe(true);
  });

  it("requires payment for a completed reservation with an outstanding balance", () => {
    const result = completeReservationSchema(true).safeParse({ payment_channel: null, payment_reference_number: "", payment_proof: fileList() });

    expect(result.success).toBe(false);
  });

  it("requires every reschedule row and a custom refund amount", () => {
    expect(rescheduleReservationSchema(1).safeParse({ date: "2026-08-28", ranges: [{ courtId: "", slot: "" }] }).success).toBe(false);
    expect(cancelReservationSchema.safeParse({ reason: "Approved force majeure", refund_type: "CUSTOM", refund_amount: "" }).success).toBe(false);
  });
});
