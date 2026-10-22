import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ManagementReservation } from "@/types/reservation";

const { mutate, detail, reservationOptions, methods } = vi.hoisted(() => ({ mutate: vi.fn(), detail: vi.fn(), reservationOptions: vi.fn(), methods: vi.fn() }));
vi.mock("@/hooks/mutations/use-reservation-mutations", () => ({
  useAddReservationAddOns: () => ({ mutate, isPending: false }),
}));
vi.mock("@/hooks/queries/use-reservations", () => ({
  useReservation: detail,
}));
vi.mock("@/hooks/queries/use-court-pricing", () => ({
  useReservationOptions: reservationOptions,
}));
vi.mock("@/hooks/queries/use-payment-methods", () => ({
  usePublicPaymentMethods: methods,
}));

import { AddOnsDialog } from "./reservation-dialogs";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const reservation: ManagementReservation = {
  id: 101, revision: 3, reference_number: "RF-101", source: "ONLINE", booking_date: "2026-10-11",
  customer: { name: "Sample Player", email: "player@example.com", contact_number: "09123456789" },
  status: "VERIFIED", display_status: "VERIFIED", is_rescheduled: false, reschedule_count: 0,
  amounts: { original: 500, adjustments: 0, final: 500, paid: 1500, outstanding: 0, refundable_credit: 1000 },
  slots: [], equipment: [], additional_players: { original_quantity: 0, unit_amount: 100 },
  rejection: null, cancellation_reason: null, timestamps: {},
};

beforeEach(() => {
  methods.mockReturnValue({ data: [], isPending: false, isError: false });
  detail.mockReturnValue({ data: reservation, isFetchedAfterMount: true });
  reservationOptions.mockReturnValue({ data: { configuration: { additional_player_price: 100 }, equipment: [], courts: [], slots: [] } });
});

describe("AddOnsDialog", () => {
  it("uses the fresh booking date and credit after an earlier reschedule", async () => {
    const user = userEvent.setup();
    const current = { ...reservation, booking_date: "2026-10-25", amounts: { ...reservation.amounts, final: 1500, paid: 1500, refundable_credit: 0 } };
    detail.mockReturnValue({ data: reservation, isFetchedAfterMount: false });
    const view = render(<AddOnsDialog reservation={reservation} open onOpenChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Review add-ons" })).not.toBeInTheDocument();
    detail.mockReturnValue({ data: current, isFetchedAfterMount: true });
    view.rerender(<AddOnsDialog reservation={reservation} open onOpenChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Add one additional player" }));
    expect(screen.getByText("Oct 25, 2026")).toBeInTheDocument();
    expect(screen.getByText("₱1,600.00")).toBeInTheDocument();
    expect(screen.queryByText("Covered by available credit")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review add-ons" })).toBeDisabled();
    expect(reservationOptions).toHaveBeenLastCalledWith("2026-10-25", [], "management");
  });
  it("renders the initially closed dialog without a selected reservation", () => {
    expect(() => render(<AddOnsDialog reservation={null} open={false} onOpenChange={vi.fn()} />)).not.toThrow();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not present missing prices as free add-ons", () => {
    reservationOptions.mockReturnValue({ data: undefined, isPending: true });
    const view = render(<AddOnsDialog reservation={reservation} open onOpenChange={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading current pricing and availability");
    expect(screen.queryByRole("button", { name: "Review add-ons" })).not.toBeInTheDocument();
    reservationOptions.mockReturnValue({ data: { configuration: { additional_player_price: 100 }, equipment: [] }, isError: true });
    view.rerender(<AddOnsDialog reservation={reservation} open onOpenChange={vi.fn()} />);
    expect(screen.getByText("We couldn't load pricing and availability.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review add-ons" })).not.toBeInTheDocument();
  });

  it("drops hidden payment requirements when existing credit covers a reduced add-on", async () => {
    const user = userEvent.setup();
    detail.mockReturnValue({ data: { ...reservation, amounts: { ...reservation.amounts, paid: 600, refundable_credit: 100 } }, isFetchedAfterMount: true });
    methods.mockReturnValue({ data: [{ id: 1, name: "GCash", account_name: "Venue", account_number: "09123456789", qr_image_url: null }] });
    render(<AddOnsDialog reservation={reservation} open onOpenChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Add one additional player" }));
    await user.click(screen.getByRole("button", { name: "Add one additional player" }));
    await user.click(screen.getByRole("combobox", { name: "Payment method" }));
    await user.click(await screen.findByRole("option", { name: "GCash" }));
    expect(screen.getByRole("button", { name: "Review add-ons" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Remove one additional player" }));
    expect(screen.getByText("Covered by available credit")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review add-ons" }));
    await user.click(screen.getByRole("button", { name: "Confirm add-ons" }));
    expect(mutate).toHaveBeenCalledWith({ id: 101, input: { expected_revision: 3, slots: [], additional_players: 1, equipment: [], quoted_amount: 600, quoted_payment_amount: 0 } }, expect.any(Object));
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
