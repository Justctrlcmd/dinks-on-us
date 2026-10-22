import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

beforeEach(() => {
  reservation.status = "COMPLETED";
  reservation.display_status = "COMPLETED";
});
afterEach(cleanup);

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
    expect(screen.getByRole("heading", { name: "Final balance payment" })).toBeInTheDocument();
    expect(screen.getAllByText("No proof image was provided for this payment.")).toHaveLength(3);
  });

  it.each(["reservations", "dashboard"] as const)("offers Verify, Reject, Close for a pending reservation from %s", async (source) => {
    reservation.status = "PENDING";
    reservation.display_status = "PENDING";
    const user = userEvent.setup();
    const onVerify = vi.fn();
    const onReject = vi.fn();
    render(<ReservationDetailDialog reservation={reservation as ManagementReservation} open source={source} onOpenChange={vi.fn()} onVerify={onVerify} onReject={onReject} />);

    const footer = screen.getByRole("button", { name: "Verify" }).closest('[data-slot="dialog-footer"]')!;
    expect(within(footer as HTMLElement).getAllByRole("button").map((button) => button.textContent)).toEqual(["Verify", "Reject", "Close"]);
    await user.click(screen.getByRole("button", { name: "Verify" }));
    expect(onVerify).toHaveBeenCalledWith(reservation);
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(onReject).toHaveBeenCalledWith(reservation);
  });

  it.each(["VERIFIED", "ONGOING", "COMPLETED", "REJECTED"])("keeps only Close when the latest reservation status is %s", (status) => {
    reservation.status = status;
    reservation.display_status = status;
    const staleRow = { ...reservation, status: "PENDING", display_status: "PENDING" } as ManagementReservation;
    render(<ReservationDetailDialog reservation={staleRow} open onOpenChange={vi.fn()} onVerify={vi.fn()} onReject={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Close" })).toHaveLength(2);
  });

  it("keeps the history detail dialog read-only", () => {
    const source = "history";
    reservation.status = "PENDING";
    reservation.display_status = "PENDING";
    render(<ReservationDetailDialog reservation={reservation as ManagementReservation} open source={source} onOpenChange={vi.fn()} onVerify={vi.fn()} onReject={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  });

  it("disables pending actions while another reservation action is running", () => {
    reservation.status = "PENDING";
    reservation.display_status = "PENDING";
    render(<ReservationDetailDialog reservation={reservation as ManagementReservation} open onOpenChange={vi.fn()} onVerify={vi.fn()} onReject={vi.fn()} actionsDisabled />);
    expect(screen.getByRole("button", { name: "Verify" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Close" }).every((button) => !(button as HTMLButtonElement).disabled)).toBe(true);
  });
});
