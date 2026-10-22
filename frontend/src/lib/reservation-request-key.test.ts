import { afterEach, describe, expect, it } from "vitest";
import { reservationRequestKey } from "./reservation-request-key";

afterEach(() => sessionStorage.clear());

describe("staff reservation retry keys", () => {
  it("retains an unconfirmed purchase key across refreshed review and payment fields", async () => {
    const input = { id: 8, input: { additional_players: 1, expected_revision: 2, quoted_amount: 700, payment_channel: "CASH" } };
    const first = await reservationRequestKey("add-on-test", 1, input);
    const retry = await reservationRequestKey("add-on-test", 1, { ...input, input: { ...input.input, expected_revision: 3, quoted_amount: 800, payment_channel: "EWALLET_BANK" } });
    expect(retry.key).toBe(first.key);
    first.release();
    expect((await reservationRequestKey("add-on-test", 1, input)).key).not.toBe(first.key);
  });

  it("keeps a refund attempt's key after refreshed details show the refund is already settled", async () => {
    const schedule = [{ court_id: 1, date: "2026-10-23", start_hour: 9 }];
    const first = await reservationRequestKey("refund-test", 1, { id: 8, input: { slots: schedule, quoted_refund_amount: 100, refund_settled: true, expected_revision: 2 } });
    const retry = await reservationRequestKey("refund-test", 1, { id: 8, input: { slots: schedule, quoted_refund_amount: 0, expected_revision: 3 } });
    expect(retry.key).toBe(first.key);
    first.release();
  });

  it("separates staff, actions, bookings, and different purchased items", async () => {
    const first = await reservationRequestKey("isolation", 1, { id: 8, input: { additional_players: 1 } });
    for (const [scope, actor, id, players] of [["isolation", 2, 8, 1], ["other", 1, 8, 1], ["isolation", 1, 9, 1], ["isolation", 1, 8, 2]] as const) {
      expect((await reservationRequestKey(scope, actor, { id, input: { additional_players: players } })).key).not.toBe(first.key);
    }
  });

  it("stores only hashes and opaque keys and handles completion FormData", async () => {
    const body = new FormData();
    body.set("quoted_amount", "700.00");
    body.set("expected_revision", "2");
    body.set("payment_reference_number", "PRIVATE-REFERENCE");
    const first = await reservationRequestKey("complete-test", 1, { id: 8, input: body });
    body.set("quoted_amount", "800.00");
    body.set("expected_revision", "3");
    expect((await reservationRequestKey("complete-test", 1, { id: 8, input: body })).key).toBe(first.key);
    const stored = Object.entries(sessionStorage).join();
    expect(stored).not.toContain("PRIVATE-REFERENCE");
    expect(stored).not.toContain("quoted_amount");
    expect(stored).toContain(first.key);
    first.release();
    expect(sessionStorage.length).toBe(0);
  });
});
