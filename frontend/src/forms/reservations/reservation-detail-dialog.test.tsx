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
  it.each([["CANCELLED", "Refund recorded"], ["COMPLETED", "Refund due"], ["VERIFIED", "Refundable credit"]] as const)("labels credit according to the finalized %s outcome", (status, label) => {
    const item = { ...reservation, status, display_status: status, amounts: { ...reservation.amounts, refundable_credit: 100 } } as ManagementReservation;
    render(<ReservationDetailDialog reservation={item} source="dashboard" open onOpenChange={vi.fn()} />);
    expect(screen.getByText(`${label}: ₱100.00`)).toBeInTheDocument();
    if (status !== "VERIFIED") expect(screen.queryByText("Refundable credit: ₱100.00")).not.toBeInTheDocument();
  });

  it("shows the complete current schedule and recorded charges after add-ons become replacements", () => {
    const item: ManagementReservation = {
      ...reservation as ManagementReservation, status: "VERIFIED", display_status: "RESCHEDULED",
      amounts: { original: 2, adjustments: 102, final: 104, paid: 104, outstanding: 0, refundable_credit: 0 },
      slots: [17, 18, 19, 20].map((hour) => ({ id: hour, court_id: 1, court_name: "Court 1", date: "2026-10-23", start_hour: hour, end_hour: hour + 1, kind: "RESCHEDULED", amount: 1 })),
      adjustments: [
        { id: 1, type: "COURT_ADD_ON", description: "Additional Court 1 time", quantity: 1, unit_amount: 1, total_amount: 1 },
        { id: 2, type: "COURT_ADD_ON", description: "Additional Court 1 time", quantity: 1, unit_amount: 1, total_amount: 1 },
        { id: 3, type: "ADDITIONAL_PLAYER", description: "Additional player", quantity: 1, unit_amount: 100, total_amount: 100 },
      ],
      payments: [
        { id: 1, method: "Cash", channel: "CASH", kind: "INITIAL", status: "VERIFIED", amount: 2, reference_number: null, proof_url: null },
        { id: 2, method: "Cash", channel: "CASH", kind: "RESCHEDULE", status: "VERIFIED", amount: 102, reference_number: null, proof_url: null },
      ],
    };
    render(<ReservationDetailDialog reservation={item} source="dashboard" open onOpenChange={vi.fn()} />);
    const summary = screen.getByRole("heading", { name: "Current reservation summary" }).closest("section")!;
    for (const time of ["5 PM–6 PM", "6 PM–7 PM", "7 PM–8 PM", "8 PM–9 PM"]) expect(within(summary).getByText(time)).toBeInTheDocument();
    expect(within(summary).getByText("Additional players: 1")).toBeInTheDocument();
    expect(within(summary).getByText("₱104.00")).toBeInTheDocument();
    const charges = screen.getByRole("heading", { name: "Recorded add-on charges" }).closest("section")!;
    expect(within(charges).getAllByText("Additional Court 1 time")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Reschedule payment" })).toBeInTheDocument();
    expect(screen.queryByText("Add-on payment recorded")).not.toBeInTheDocument();
  });
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
