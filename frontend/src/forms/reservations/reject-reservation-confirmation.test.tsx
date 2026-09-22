import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ManagementReservation } from "@/types/reservation";

const mutate = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/mutations/use-reservation-mutations", () => ({
  useRejectReservation: () => ({ mutate, isPending: false, rateLimitCooldown: { isCoolingDown: false, remainingSeconds: 0, label: "" } }),
  useAddReservationAddOns: vi.fn(),
  useCancelReservation: vi.fn(),
  useCompleteReservation: vi.fn(),
  useRescheduleReservation: vi.fn(),
}));

import { RejectReservationDialog } from "./reservation-dialogs";

const reservation: ManagementReservation = {
  id: 101,
  reference_number: "DOU-0101",
  source: "ONLINE",
  booking_date: "2026-09-21",
  customer: { name: "Test Player", email: "player@example.com", contact_number: "09171234567" },
  status: "PENDING",
  display_status: "PENDING",
  is_rescheduled: false,
  reschedule_count: 0,
  amounts: { original: 500, adjustments: 0, final: 500, paid: 500, outstanding: 0, refundable_credit: 0 },
  additional_players: { original_quantity: 0, unit_amount: 0 },
  rejection: null,
  cancellation_reason: null,
  timestamps: {},
};

afterEach(() => mutate.mockReset());

describe("RejectReservationDialog", () => {
  it("holds the validated rejection until its final confirmation", async () => {
    const user = userEvent.setup();
    render(<RejectReservationDialog reservation={reservation} open onOpenChange={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("Explain why this reservation cannot be accepted."), "Payment proof does not match the reservation.");
    await user.click(screen.getByRole("button", { name: "Review rejection" }));

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByText("This cannot be reversed. The reservation will be finalized and its court times released.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reject reservation" }));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({
      id: 101,
      concern: "INVALID_PAYMENT_PROOF",
      reason: "Payment proof does not match the reservation.",
    });
  });
});
