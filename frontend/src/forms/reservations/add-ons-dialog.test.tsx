import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ManagementReservation } from "@/types/reservation";

const mutate = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/mutations/use-reservation-mutations", () => ({
  useAddReservationAddOns: () => ({ mutate, isPending: false }),
}));
vi.mock("@/hooks/queries/use-reservations", () => ({
  useReservation: () => ({ data: undefined }),
}));
vi.mock("@/hooks/queries/use-court-pricing", () => ({
  useReservationOptions: () => ({ data: { configuration: { additional_player_price: 100 }, equipment: [], courts: [], slots: [] } }),
}));
vi.mock("@/hooks/queries/use-payment-methods", () => ({
  usePublicPaymentMethods: () => ({ data: [], isPending: false, isError: false }),
}));

import { AddOnsDialog } from "./reservation-dialogs";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const reservation: ManagementReservation = {
  id: 101, reference_number: "RF-101", source: "ONLINE", booking_date: "2026-10-11",
  customer: { name: "Sample Player", email: "player@example.com", contact_number: "09123456789" },
  status: "VERIFIED", display_status: "VERIFIED", is_rescheduled: false, reschedule_count: 0,
  amounts: { original: 500, adjustments: 0, final: 500, paid: 1500, outstanding: 0, refundable_credit: 1000 },
  slots: [], equipment: [], additional_players: { original_quantity: 0, unit_amount: 100 },
  rejection: null, cancellation_reason: null, timestamps: {},
};

describe("AddOnsDialog", () => {
  it("renders the initially closed dialog without a selected reservation", () => {
    expect(() => render(<AddOnsDialog reservation={null} open={false} onOpenChange={vi.fn()} />)).not.toThrow();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the booking date visible when reviewing add-ons", async () => {
    const user = userEvent.setup();
    render(<AddOnsDialog reservation={reservation} open onOpenChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Add one additional player" }));
    await user.click(screen.getByRole("button", { name: "Review add-ons" }));
    expect(screen.getByRole("button", { name: "Confirm add-ons" })).toBeInTheDocument();
    const confirmation = screen.getByRole("button", { name: "Confirm add-ons" }).closest('[role="dialog"]') as HTMLElement;
    expect(within(confirmation).getByText("Oct 11, 2026")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });
});
