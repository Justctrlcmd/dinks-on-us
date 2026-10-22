import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NormalizedApiError } from "@/lib/api";
import type { ManagementReservation } from "@/types/reservation";

const { detail, complete, cancel } = vi.hoisted(() => ({ detail: vi.fn(), complete: vi.fn(), cancel: vi.fn() }));
vi.mock("@/hooks/queries/use-reservations", () => ({ useReservation: detail }));
vi.mock("@/hooks/mutations/use-reservation-mutations", () => ({
  useCompleteReservation: () => ({ mutate: complete, isPending: false }),
  useCancelReservation: () => ({ mutate: cancel, isPending: false }),
}));
import { CancelReservationDialog, CompleteReservationDialog } from "./reservation-dialogs";
const stale: ManagementReservation = {
  id: 8, revision: 3, reference_number: "RF-008", source: "ONLINE", booking_date: "2026-10-23",
  customer: { name: "Player", email: "player@example.com", contact_number: "09123456789" },
  status: "VERIFIED", display_status: "VERIFIED", is_rescheduled: false, reschedule_count: 0,
  amounts: { original: 2, adjustments: 0, final: 2, paid: 2, outstanding: 0, refundable_credit: 0 },
  additional_players: { original_quantity: 0, unit_amount: 100 }, slots: [], equipment: [],
  rejection: null, cancellation_reason: null, timestamps: {},
};
beforeEach(() => { detail.mockReturnValue({ data: stale, isFetchedAfterMount: true }); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("finalizing the current reservation", () => {
  it("waits for the current record and reviews its actual settlement", async () => {
    const user = userEvent.setup();
    detail.mockReturnValue({ data: stale, isFetchedAfterMount: false });
    const view = render(<CompleteReservationDialog reservation={stale} open onOpenChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Review completion" })).not.toBeInTheDocument();
    const current = { ...stale, status: "ONGOING", amounts: { ...stale.amounts, final: 104, paid: 4, outstanding: 100 } };
    detail.mockReturnValue({ data: current, isFetchedAfterMount: true });
    view.rerender(<CompleteReservationDialog reservation={stale} open onOpenChange={vi.fn()} />);
    expect(screen.getByText("₱104.00")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review completion" }));
    expect(screen.queryByRole("button", { name: "Complete reservation" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "How was the additional amount collected?" }));
    await user.click(await screen.findByRole("option", { name: "Cash" }));
    await user.click(screen.getByRole("button", { name: "Review completion" }));
    const confirmation = screen.getByRole("button", { name: "Complete reservation" }).closest('[role="dialog"]') as HTMLElement;
    expect(within(confirmation).getByText("₱100.00 · CASH")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Complete reservation" }));
    expect(complete).toHaveBeenCalledWith({ id: 8, input: expect.any(FormData) }, expect.any(Object));
  });

  it("can review completion without a settlement input when already paid", async () => {
    const user = userEvent.setup();
    detail.mockReturnValue({ data: { ...stale, status: "ONGOING" }, isFetchedAfterMount: true });
    render(<CompleteReservationDialog reservation={stale} open onOpenChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Review completion" }));
    expect(screen.getByRole("button", { name: "Complete reservation" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Complete reservation" }));
    const input = complete.mock.calls[0][0].input as FormData;
    expect(input.get("expected_revision")).toBe("3");
    expect(input.get("quoted_amount")).toBe("2.00");
    expect(input.get("quoted_payment_amount")).toBe("0.00");
  });

  it("shows the full refund including all earlier paid add-ons", async () => {
    const user = userEvent.setup();
    detail.mockReturnValue({ data: { ...stale, amounts: { ...stale.amounts, final: 104, paid: 104 } }, isFetchedAfterMount: true });
    render(<CancelReservationDialog reservation={stale} open onOpenChange={vi.fn()} />);
    expect(screen.getByText("Full refund · ₱104.00")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Cancellation reason/), "Court flooding");
    await user.click(screen.getByRole("button", { name: "Review cancellation" }));
    const confirmation = screen.getByRole("button", { name: "Cancel reservation" }).closest('[role="dialog"]') as HTMLElement;
    expect(within(confirmation).getByText("₱104.00")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel reservation" }));
    expect(cancel).toHaveBeenCalledWith({ id: 8, input: { expected_revision: 3, reason: "Court flooding", refund_type: "FULL", quoted_refund_amount: 104 } }, expect.any(Object));
  });

  it("discards an open refund confirmation when refreshed booking amounts change", async () => {
    const user = userEvent.setup();
    const view = render(<CancelReservationDialog reservation={stale} open onOpenChange={vi.fn()} />);
    await user.type(screen.getByLabelText(/Cancellation reason/), "Court flooding");
    await user.click(screen.getByRole("button", { name: "Review cancellation" }));
    expect(screen.getByRole("button", { name: "Cancel reservation" })).toBeInTheDocument();
    detail.mockReturnValue({ data: { ...stale, amounts: { ...stale.amounts, paid: 104, final: 104 } }, isFetchedAfterMount: true });
    view.rerender(<CancelReservationDialog reservation={stale} open onOpenChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Cancel reservation" })).not.toBeInTheDocument();
    expect(screen.getByText("Full refund · ₱104.00")).toBeInTheDocument();
    expect(screen.getByLabelText(/Cancellation reason/)).toHaveValue("");
    expect(cancel).not.toHaveBeenCalled();
  });

  it("closes an altered retry so staff must review the already-recorded booking", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<CancelReservationDialog reservation={stale} open onOpenChange={onOpenChange} />);
    await user.type(screen.getByLabelText(/Cancellation reason/), "Court flooding");
    await user.click(screen.getByRole("button", { name: "Review cancellation" }));
    await user.click(screen.getByRole("button", { name: "Cancel reservation" }));
    await act(async () => { cancel.mock.calls[0][1].onError(new NormalizedApiError({ status: 409, code: "RESERVATION_REQUEST_KEY_REUSED", message: "Already recorded with different details." })); });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("blocks a custom refund greater than the current collected amount", async () => {
    const user = userEvent.setup();
    render(<CancelReservationDialog reservation={stale} open onOpenChange={vi.fn()} />);
    await user.type(screen.getByLabelText(/Cancellation reason/), "Court flooding");
    await user.click(screen.getByRole("combobox", { name: "Refund" }));
    await user.click(await screen.findByRole("option", { name: "Custom refund" }));
    await user.type(screen.getByLabelText(/Custom refund amount/), "3");
    await user.click(screen.getByRole("button", { name: "Review cancellation" }));
    expect(screen.getByRole("alert")).toHaveTextContent("The refund cannot exceed the amount collected.");
    expect(cancel).not.toHaveBeenCalled();
  });

  it.each([CancelReservationDialog, CompleteReservationDialog])("blocks finalized records and failed refreshes", (Component) => {
    detail.mockReturnValue({ data: { ...stale, status: "COMPLETED" }, isFetchedAfterMount: true });
    const view = render(<Component reservation={stale} open onOpenChange={vi.fn()} />);
    expect(screen.getByText("This action is no longer available for this reservation.")).toBeInTheDocument();
    detail.mockReturnValue({ data: stale, isFetchedAfterMount: true, isError: true });
    view.rerender(<Component reservation={stale} open onOpenChange={vi.fn()} />);
    expect(screen.getByText("We couldn't load the current reservation.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Review/ })).not.toBeInTheDocument();
  });
});
