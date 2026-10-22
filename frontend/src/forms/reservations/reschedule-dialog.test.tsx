import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ManagementReservation } from "@/types/reservation";

const { useDetail, mutate, options } = vi.hoisted(() => ({
  useDetail: vi.fn(), mutate: vi.fn(),
  options: {
    date: "2026-10-23", configuration: { additional_player_price: 100 },
    courts: [{ id: 1, name: "Court 1", court_number: 1 }],
    slots: Array.from({ length: 15 }, (_, i) => ({ start_hour: i + 7, end_hour: i + 8, price: 1 })),
    equipment: [], is_date_closed: false, past_slots: [],
    unavailable_slots: [17, 18, 19, 20].map((start_hour) => ({ court_id: 1, start_hour })),
  },
}));
vi.mock("@/hooks/queries/use-reservations", () => ({ useReservation: useDetail }));
vi.mock("@/hooks/mutations/use-reservation-mutations", () => ({ useRescheduleReservation: () => ({ mutate, isPending: false }) }));
vi.mock("@/hooks/queries/use-court-pricing", () => ({
  useReservationOptions: (date: string) => ({ data: { ...options, date, unavailable_slots: date === "2026-10-23" ? options.unavailable_slots : [] }, isPending: false, isError: false }),
  useReservationClosedDates: () => ({ data: [] }),
}));
vi.mock("@/hooks/queries/use-payment-methods", () => ({ usePublicPaymentMethods: () => ({ data: [], isPending: false, isError: false }) }));

import { RescheduleReservationDialog } from "./reservation-dialogs";

const latest: ManagementReservation = {
  id: 8, revision: 3, reference_number: "RF-008", source: "ONLINE", booking_date: "2026-10-23",
  customer: { name: "Player", email: "player@example.com", contact_number: "09123456789" },
  status: "VERIFIED", display_status: "RESCHEDULED", is_rescheduled: true, reschedule_count: 1,
  amounts: { original: 2, adjustments: 102, final: 104, paid: 104, outstanding: 0, refundable_credit: 0 },
  slots: [17, 18, 19, 20].map((hour, i) => ({ id: i + 1, court_id: 1, court_name: "Court 1", date: "2026-10-23", start_hour: hour, end_hour: hour + 1, amount: 1, kind: i < 2 ? "RESCHEDULED" : "ADD_ON" })),
  additional_players: { original_quantity: 0, unit_amount: 100 }, equipment: [],
  adjustments: [{ id: 1, type: "ADDITIONAL_PLAYER", description: "Additional player", quantity: 1, unit_amount: 100, total_amount: 100 }],
  rejection: null, cancellation_reason: null, timestamps: {},
};
const stale = { ...latest, slots: latest.slots!.slice(0, 2), reschedule_count: 0, amounts: { ...latest.amounts, final: 2, paid: 2 } };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-22T05:00:00Z"));
  useDetail.mockReturnValue({ data: latest, isError: false, isFetchedAfterMount: true });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });

describe("rescheduling the current reservation", () => {
  it.each(["2026-10-10", "2026-11-20"])("defaults to today instead of the existing booking date %s", (bookingDate) => {
    useDetail.mockReturnValue({ data: { ...latest, booking_date: bookingDate }, isError: false, isFetchedAfterMount: true });
    render(<RescheduleReservationDialog reservation={stale} open onOpenChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Date/ })).toHaveTextContent("Oct 22, 2026");
  });

  it("uses the Philippine date and recomputes it on reopening", () => {
    const view = render(<RescheduleReservationDialog reservation={stale} open onOpenChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Date/ })).toHaveTextContent("Oct 22, 2026");
    view.rerender(<RescheduleReservationDialog reservation={stale} open={false} onOpenChange={vi.fn()} />);
    // Still Oct 22 in UTC, already Oct 23 in Manila.
    vi.setSystemTime(new Date("2026-10-22T16:30:00Z"));
    view.rerender(<RescheduleReservationDialog reservation={stale} open onOpenChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Date/ })).toHaveTextContent("Oct 23, 2026");
  });

  it("waits for fresh details before showing the schedule and payment baseline", () => {
    useDetail.mockReturnValue({ data: stale, isError: false, isFetchedAfterMount: false });
    const view = render(<RescheduleReservationDialog reservation={stale} open onOpenChange={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading the current schedule and payments");
    expect(screen.queryByRole("button", { name: "Review reschedule" })).not.toBeInTheDocument();
    useDetail.mockReturnValue({ data: latest, isError: false, isFetchedAfterMount: true });
    view.rerender(<RescheduleReservationDialog reservation={stale} open onOpenChange={vi.fn()} />);
    expect(screen.getByText("4 of 4 replacement slots selected")).toBeInTheDocument();
    const baseline = screen.getByRole("region", { name: "Current booking" });
    expect(within(baseline).getAllByText("₱104.00")).toHaveLength(2);
    expect(within(baseline).getByText(/1 additional players carried forward/)).toBeInTheDocument();
    expect(useDetail).toHaveBeenCalledWith(8, { refetchOnMount: "always" });
  });

  it("replaces previously paid add-ons freely without requesting their payment again", async () => {
    const user = userEvent.setup();
    render(<RescheduleReservationDialog reservation={stale} open onOpenChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Time slots" }));
    await user.click(screen.getByRole("checkbox", { name: "7:00 PM – 8:00 PM" }));
    expect(screen.getByText("3 of 4 replacement slots selected")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "9:00 PM – 10:00 PM" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByText(/overlap/)).not.toBeInTheDocument();
    expect(screen.getByText("No balance difference")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review reschedule" }));
    await user.click(screen.getByRole("button", { name: "Confirm reschedule" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith({
      id: 8, input: {
        expected_revision: 3, quoted_amount: 104, quoted_payment_amount: 0, quoted_refund_amount: 0,
        slots: [17, 18, 20, 21].map((start_hour) => ({ court_id: 1, date: "2026-10-22", start_hour })),
        add_on_slots: [], additional_players: 0, equipment: [],
      },
    }, expect.any(Object)));
  });

  it("requires confirmation of the exact refund and resets acknowledgment when reviewing again", async () => {
    const user = userEvent.setup();
    const cheaper = { ...latest, amounts: { ...latest.amounts, paid: 114, refundable_credit: 10 } };
    useDetail.mockReturnValue({ data: cheaper, isError: false, isFetchedAfterMount: true });
    render(<RescheduleReservationDialog reservation={stale} open onOpenChange={vi.fn()} />);
    expect(screen.getByText("Refund to settle now")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review reschedule" }));
    const confirm = screen.getByRole("button", { name: "Confirm refund and reschedule" });
    expect(confirm).toBeDisabled();
    expect(screen.getByText(/Return ₱10.00 to the customer before confirming/)).toBeInTheDocument();
    await user.click(confirm);
    expect(mutate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("checkbox", { name: "I confirm the customer has received ₱10.00." }));
    expect(confirm).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "Review reschedule" }));
    expect(screen.getByRole("button", { name: "Confirm refund and reschedule" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "I confirm the customer has received ₱10.00." }));
    await user.click(screen.getByRole("button", { name: "Confirm refund and reschedule" }));
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ input: expect.objectContaining({
      quoted_amount: 104, quoted_payment_amount: 0, quoted_refund_amount: 10, refund_settled: true,
    }) }), expect.any(Object));
  });

  it("does not offer money already refunded as credit on a later reschedule", async () => {
    const user = userEvent.setup();
    const refunded = { ...latest, amounts: { ...latest.amounts, paid: 114, refunded: 10, net_paid: 104 },
      refunds: [{ id: 1, type: "RESCHEDULE_CREDIT", status: "COMPLETED", amount: 10, reason: null }] };
    useDetail.mockReturnValue({ data: refunded, isError: false, isFetchedAfterMount: true });
    render(<RescheduleReservationDialog reservation={stale} open onOpenChange={vi.fn()} />);
    expect(screen.getByText("Paid after refunds")).toBeInTheDocument();
    expect(screen.getByText("No balance difference")).toBeInTheDocument();
    expect(screen.queryByText("Refund to settle now")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review reschedule" }));
    expect(screen.queryByRole("checkbox", { name: /I confirm the customer has received/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm reschedule" })).toBeEnabled();
  });

  it("blocks editing if the latest reservation was finalized", () => {
    useDetail.mockReturnValue({ data: { ...latest, status: "COMPLETED" }, isError: false, isFetchedAfterMount: true });
    render(<RescheduleReservationDialog reservation={stale} open onOpenChange={vi.fn()} />);
    expect(screen.getByText("This action is no longer available for this reservation.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review reschedule" })).not.toBeInTheDocument();
  });
});
