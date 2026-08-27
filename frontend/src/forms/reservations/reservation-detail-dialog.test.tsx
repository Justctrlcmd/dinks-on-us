import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ManagementReservation } from "@/types/reservation";

const reservation = vi.hoisted(() => ({
  id: 101,
  reference_number: "RF-101",
  source: "ONLINE",
  booking_date: "2026-08-27",
  customer: { name: "Jamie Cruz", email: "jamie@example.com", contact_number: "09123456789" },
  status: "COMPLETED",
  display_status: "COMPLETED",
  is_rescheduled: false,
  reschedule_count: 0,
  amounts: { original: 500, adjustments: 250, final: 750, paid: 750, outstanding: 0, refundable_credit: 0 },
  slots: [],
  equipment: [],
  additional_players: { original_quantity: 0, unit_amount: 100 },
  payments: [
    { id: 1, method: "GCash", channel: "EWALLET", kind: "INITIAL", status: "VERIFIED", amount: 500, reference_number: "PAY-001", proof_url: null },
    { id: 2, method: "Cash", channel: "CASH", kind: "ADD_ON", status: "VERIFIED", amount: 200, reference_number: null, proof_url: null },
    { id: 3, method: "Cash", channel: "CASH", kind: "SETTLEMENT", status: "VERIFIED", amount: 50, reference_number: null, proof_url: null },
  ],
  adjustments: [],
  rejection: null,
  cancellation_reason: null,
  timestamps: {},
}));

vi.mock("@/hooks/queries/use-reservations", () => ({
  useReservation: () => ({ data: reservation, isPending: false }),
}));
vi.mock("@/hooks/queries/use-history", () => ({
  useHistoryReservation: () => ({ data: undefined, isPending: false }),
}));
vi.mock("@/hooks/queries/use-dashboard", () => ({
  useDashboardReservation: () => ({ data: undefined, isPending: false }),
}));

import { ReservationDetailDialog } from "@/forms/reservations/reservation-dialogs";

describe("ReservationDetailDialog", () => {
  it("clearly identifies original, add-on, and final balance payments", () => {
    render(
      <ReservationDetailDialog
        reservation={reservation as ManagementReservation}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Payment records and proofs" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Original reservation payment" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add-on payment" })).toBeInTheDocument();
    expect(screen.getByText("Payment recorded for added court time, players, or equipment.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Final balance payment" })).toBeInTheDocument();
    expect(screen.getAllByText("No proof image was provided for this payment.")).toHaveLength(3);
  });
});
