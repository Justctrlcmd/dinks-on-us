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

    submitReservation(input);

    expect(publicFetch).toHaveBeenCalledWith("/api/v1/public/reservations", {
      method: "POST",
      csrf: true,
      body: input,
    });
  });

  it("serializes a walk-in as an authenticated multipart request", async () => {
    const { createWalkInReservation } = await import("./reservation-service");

    createWalkInReservation({
      customer_name: "Maria Walk In",
      customer_email: "maria@example.com",
      customer_contact_number: "09171234567",
      slots: [{ court_id: 2, date: "2026-08-28", start_hour: 15 }],
      equipment: [{ id: 5, quantity: 2 }],
      additional_players: 1,
      payment_channel: "EWALLET_BANK",
      payment_reference_number: "TX-100",
    });

    expect(authFetch).toHaveBeenCalledWith(
      "/api/v1/management/reservations/walk-in",
      expect.objectContaining({ method: "POST", csrf: true }),
    );
    const body = authFetch.mock.calls[0][1].body as FormData;
    expect(body.get("payment_channel")).toBe("EWALLET_BANK");
    expect(body.get("payment_reference_number")).toBe("TX-100");
    expect(body.get("slots[0][court_id]")).toBe("2");
    expect(body.get("equipment[0][quantity]")).toBe("2");
    expect(body.has("payment_proof")).toBe(false);
  });
});
