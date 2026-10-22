import { describe, expect, it, vi } from "vitest";

const publicFetch = vi.fn();
const authFetch = vi.fn();

vi.mock("@/lib/api", () => ({
  authFetch,
  publicFetch,
}));

describe("reservation service", () => {
  it("initializes the CSRF session before submitting a public reservation", async () => {
    const { submitReservation } = await import("./reservation-service");
    const input = new FormData();

    submitReservation({ input, idempotencyKey: "test-key" });

    expect(publicFetch).toHaveBeenCalledWith("/api/v1/public/reservations", {
      method: "POST",
      csrf: true,
      headers: { "Idempotency-Key": "test-key" },
      body: input,
    });
  });

  it("loads private reservation proofs through the same-origin API proxy", async () => {
    const { reservationProofUrl } = await import("./reservation-service");

    expect(reservationProofUrl("/api/v1/management/reservations/42/proof")).toBe("/backend/api/v1/management/reservations/42/proof");
  });

  it("serializes a walk-in as an authenticated multipart request", async () => {
    const { createWalkInReservation } = await import("./reservation-service");
    const proof = new File(["receipt"], "receipt.png", { type: "image/png" });

    createWalkInReservation({
      quoted_amount: 650.1,
      customer_name: "Maria Walk In",
      customer_email: "maria@example.com",
      customer_contact_number: "09171234567",
      slots: [{ court_id: 2, date: "2026-08-28", start_hour: 15 }],
      equipment: [{ id: 5, quantity: 2 }],
      additional_players: 1,
      payment_channel: "EWALLET_BANK",
      payment_method_id: 7,
      payment_reference_number: "TX-100",
      payment_proof: proof,
    }, "walk-in-service-request");

    expect(authFetch).toHaveBeenCalledWith(
      "/api/v1/management/reservations/walk-in",
      expect.objectContaining({ method: "POST", csrf: true }),
    );
    expect(authFetch.mock.calls[0][1].headers).toEqual({ "Idempotency-Key": "walk-in-service-request" });
    const body = authFetch.mock.calls[0][1].body as FormData;
    expect(body.get("payment_channel")).toBe("EWALLET_BANK");
    expect(body.get("payment_method_id")).toBe("7");
    expect(body.get("payment_reference_number")).toBe("TX-100");
    expect(body.get("slots[0][court_id]")).toBe("2");
    expect(body.get("equipment[0][quantity]")).toBe("2");
    expect(body.get("quoted_amount")).toBe("650.10");
    expect(body.get("payment_proof")).toBe(proof);
  });

  it("uses the aggregate endpoint for the pending badge", async () => {
    const { getPendingReservationSummary } = await import("./reservation-service");
    const signal = new AbortController().signal;
    authFetch.mockClear();

    getPendingReservationSummary(signal);

    expect(authFetch).toHaveBeenCalledWith("/api/v1/management/reservations/pending-summary", { signal });
  });

  it("serializes a non-cash add-on with the configured method and proof", async () => {
    const { addReservationAddOns } = await import("./reservation-service");
    const proof = new File(["receipt"], "add-on-receipt.png", { type: "image/png" });
    authFetch.mockClear();

    addReservationAddOns(12, {
      expected_revision: 3,
      quoted_amount: 850.1, quoted_payment_amount: 200.1,
      additional_players: 1,
      equipment: [{ id: 5, quantity: 2 }],
      payment_channel: "EWALLET_BANK",
      payment_method_id: 7,
      payment_reference_number: "ADDON-100",
      payment_proof: proof,
    }, "addon-service-request");

    expect(authFetch).toHaveBeenCalledWith(
      "/api/v1/management/reservations/12/add-ons",
      expect.objectContaining({ method: "POST", csrf: true }),
    );
    expect(authFetch.mock.calls[0][1].headers).toEqual({ "Idempotency-Key": "addon-service-request" });
    const body = authFetch.mock.calls[0][1].body as FormData;
    expect(body.get("expected_revision")).toBe("3");
    expect(body.get("payment_channel")).toBe("EWALLET_BANK");
    expect(body.get("payment_method_id")).toBe("7");
    expect(body.get("payment_reference_number")).toBe("ADDON-100");
    expect(body.get("quoted_amount")).toBe("850.10");
    expect(body.get("quoted_payment_amount")).toBe("200.10");
    expect(body.get("payment_proof")).toBe(proof);
  });

  it("serializes reschedule slots, add-ons, and balance payment as multipart data", async () => {
    const { rescheduleReservation } = await import("./reservation-service");
    const proof = new File(["receipt"], "reschedule.png", { type: "image/png" });
    authFetch.mockClear();

    rescheduleReservation(12, {
      expected_revision: 3,
      quoted_amount: 950, quoted_payment_amount: 0, quoted_refund_amount: 100, refund_settled: true,
      slots: [{ court_id: 2, date: "2026-08-28", start_hour: 18 }],
      add_on_slots: [{ court_id: 1, date: "2026-08-28", start_hour: 19 }],
      additional_players: 1,
      payment_channel: "EWALLET_BANK",
      payment_method_id: 7,
      payment_reference_number: "RESCHEDULE-100",
      payment_proof: proof,
    }, "reschedule-service-request");

    expect(authFetch).toHaveBeenCalledWith(
      "/api/v1/management/reservations/12/reschedule",
      expect.objectContaining({ method: "POST", csrf: true }),
    );
    expect(authFetch.mock.calls[0][1].headers).toEqual({ "Idempotency-Key": "reschedule-service-request" });
    const body = authFetch.mock.calls[0][1].body as FormData;
    expect(body.get("expected_revision")).toBe("3");
    expect(body.get("slots[0][start_hour]")).toBe("18");
    expect(body.get("quoted_amount")).toBe("950.00");
    expect(body.get("quoted_refund_amount")).toBe("100.00");
    expect(body.get("refund_settled")).toBe("1");
    expect(body.get("quoted_payment_amount")).toBe("0.00");
    expect(body.get("add_on_slots[0][start_hour]")).toBe("19");
    expect(body.get("additional_players")).toBe("1");
    expect(body.get("payment_reference_number")).toBe("RESCHEDULE-100");
    expect(body.get("payment_proof")).toBe(proof);
  });
});
