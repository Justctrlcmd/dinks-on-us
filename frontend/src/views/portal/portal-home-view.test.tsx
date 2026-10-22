import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { dashboardQuery, useDashboardMock, userQuery, verifyMutation, rejectMutation } = vi.hoisted(() => ({
  userQuery: { data: { role: { is_full_access: true }, modules: ["DASHBOARD"] } },
  verifyMutation: { mutate: vi.fn(), isPending: false, rateLimitCooldown: { isCoolingDown: false, label: "" } },
  rejectMutation: { mutate: vi.fn(), isPending: false },
  useDashboardMock: vi.fn(),
  dashboardQuery: {
    data: {
      week: { start: "2026-08-24", end: "2026-08-30" },
      kpis: { pending: 2, verified: 3, completed: 4, revenue: 5500 },
      days: [
        { date: "2026-08-24", available_slots: 0, total_slots: 0, is_closed: false, is_past: true },
        { date: "2026-08-25", available_slots: 0, total_slots: 0, is_closed: false, is_past: true },
        { date: "2026-08-26", available_slots: 0, total_slots: 0, is_closed: false, is_past: true },
        { date: "2026-08-27", available_slots: 2, total_slots: 5, is_closed: false, is_past: false },
        { date: "2026-08-28", available_slots: 5, total_slots: 5, is_closed: false, is_past: false },
        { date: "2026-08-29", available_slots: 0, total_slots: 5, is_closed: true, is_past: false },
        { date: "2026-08-30", available_slots: 5, total_slots: 5, is_closed: false, is_past: false },
      ],
      selected_date: {
        date: "2026-08-27",
        is_closed: false,
        opening_hour: 9,
        closing_hour: 14,
        courts: [{
          id: 1,
          name: "Court 1",
          slots: [
            { start_hour: 9, end_hour: 10, price: 500, status: "PAST", reservation_id: null, reservation_reference: null },
            { start_hour: 10, end_hour: 11, price: 500, status: "AVAILABLE", reservation_id: null, reservation_reference: null },
            { start_hour: 11, end_hour: 12, price: 500, status: "PENDING", reservation_id: 101, reservation_reference: "RF-101" },
            { start_hour: 12, end_hour: 13, price: 500, status: "VERIFIED", reservation_id: 102, reservation_reference: "RF-102" },
            { start_hour: 13, end_hour: 14, price: 500, status: "CLOSED", reservation_id: null, reservation_reference: null },
          ],
        }],
      },
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  },
}));

vi.mock("@/hooks/queries/use-dashboard", () => ({
  useDashboard: (...args: unknown[]) => useDashboardMock(...args),
  useDashboardReservation: (id: number | null) => ({ data: id ? {
    id, reference_number: `RF-${id}`, source: "ONLINE", booking_date: "2026-08-27",
    customer: { name: "Sample Player", email: "player@example.com", contact_number: "09123456789" },
    status: id === 101 ? "PENDING" : "VERIFIED", display_status: id === 101 ? "PENDING" : "VERIFIED",
    amounts: { original: 500, adjustments: 0, final: 500, paid: 0, outstanding: 500, refundable_credit: 0 },
    additional_players: { original_quantity: 0, unit_amount: 100 }, slots: [], equipment: [], payments: [],
  } : undefined, isPending: false }),
}));
vi.mock("@/hooks/queries/use-current-user", () => ({ useCurrentUser: () => userQuery }));
vi.mock("@/hooks/queries/use-reservations", () => ({ useReservation: () => ({ data: undefined, isPending: false }) }));
vi.mock("@/hooks/queries/use-history", () => ({ useHistoryReservation: () => ({ data: undefined, isPending: false }) }));
vi.mock("@/hooks/mutations/use-reservation-mutations", () => ({
  useVerifyReservation: () => verifyMutation,
  useRejectReservation: () => rejectMutation,
}));

import { PortalHomeView } from "@/views/portal/portal-home-view";

describe("PortalHomeView", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-27T03:00:00.000Z"));
    useDashboardMock.mockReturnValue(dashboardQuery);
    userQuery.data.role.is_full_access = true;
    userQuery.data.modules = ["DASHBOARD"];
    verifyMutation.isPending = false;
    verifyMutation.rateLimitCooldown.isCoolingDown = false;
    verifyMutation.mutate.mockReset();
    rejectMutation.mutate.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useDashboardMock.mockReset();
  });

  it("shows weekly KPIs, week availability, and status-aware court slots", () => {
    render(<PortalHomeView />);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("₱5,500")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thu 27, 2 of 5 available" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("2/5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mon 24, Past" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Sat 29, Closed" })).toBeDisabled();
    const timeCard = screen.getByRole("heading", { name: "9:00 AM – 10:00 AM" }).closest("article");
    expect(timeCard).toHaveClass("rounded-xl", "bg-background", "p-3");
    screen.getAllByRole("button", { name: /Court 1, 9:00 AM.*Past/ }).forEach((slot) => expect(slot).toBeDisabled());
    screen.getAllByRole("button", { name: /Court 1, 10:00 AM.*Available/ }).forEach((slot) => {
      expect(slot).toBeDisabled();
      expect(slot).toHaveClass("bg-background");
      expect(slot).not.toHaveClass("bg-success/10");
    });
    screen.getAllByRole("button", { name: /Court 1, 1:00 PM.*Closed/ }).forEach((slot) => expect(slot).toBeDisabled());
  });

  it("opens the dashboard detail with pending actions for a Manager", () => {
    render(<PortalHomeView />);

    fireEvent.click(screen.getAllByRole("button", { name: /View pending reservation RF-101/ })[0]);

    expect(screen.getByRole("heading", { name: "Reservation details" })).toBeInTheDocument();
    expect(screen.getByText("RF-101 · PENDING")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("moves the selected date with week navigation", () => {
    render(<PortalHomeView />);

    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));

    expect(useDashboardMock).toHaveBeenLastCalledWith("2026-08-17", "2026-08-17");

    fireEvent.click(screen.getByRole("button", { name: "Next week" }));

    expect(useDashboardMock).toHaveBeenLastCalledWith("2026-08-24", "2026-08-24");
  });
  it("keeps Dashboard-only staff views read-only", () => {
    userQuery.data.role.is_full_access = false;
    render(<PortalHomeView />);
    fireEvent.click(screen.getAllByRole("button", { name: /View pending reservation RF-101/ })[0]);
    expect(screen.getByRole("heading", { name: "Reservation details" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  });

  it("lets staff with Reservation access review verification before sending the existing mutation", () => {
    userQuery.data.role.is_full_access = false;
    userQuery.data.modules = ["DASHBOARD", "RESERVATION"];
    render(<PortalHomeView />);
    fireEvent.click(screen.getAllByRole("button", { name: /View pending reservation RF-101/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(screen.getByRole("heading", { name: "Verify this reservation?" })).toBeInTheDocument();
    expect(verifyMutation.mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Yes, verify" }));
    expect(verifyMutation.mutate).toHaveBeenCalledWith(101, expect.objectContaining({ onSuccess: expect.any(Function) }));
  });

  it("uses the existing rejection form and requires its final confirmation", async () => {
    render(<PortalHomeView />);
    fireEvent.click(screen.getAllByRole("button", { name: /View pending reservation RF-101/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    const formDialog = screen.getByRole("heading", { name: "Reject RF-101?" }).closest('[role="dialog"]') as HTMLElement;
    fireEvent.change(within(formDialog).getByRole("textbox", { name: "Reason" }), { target: { value: "Payment proof does not match." } });
    fireEvent.click(within(formDialog).getByRole("button", { name: "Review rejection" }));
    const confirm = await screen.findByRole("button", { name: "Reject reservation" });
    expect(rejectMutation.mutate).not.toHaveBeenCalled();
    fireEvent.click(confirm);
    await waitFor(() => expect(rejectMutation.mutate).toHaveBeenCalledWith({ id: 101, concern: "INVALID_PAYMENT_PROOF", reason: "Payment proof does not match." }, expect.any(Object)));
  });

  it("shows no payment-review actions for a verified booking", () => {
    render(<PortalHomeView />);
    fireEvent.click(screen.getAllByRole("button", { name: /View verified reservation RF-102/ })[0]);
    expect(screen.getByText("RF-102 · VERIFIED")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  });

  it("blocks repeat verification while pending or rate-limited", () => {
    render(<PortalHomeView />);
    fireEvent.click(screen.getAllByRole("button", { name: /View pending reservation RF-101/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    verifyMutation.rateLimitCooldown.isCoolingDown = true;
    fireEvent.click(screen.getByRole("button", { name: "Yes, verify" }));
    expect(verifyMutation.mutate).not.toHaveBeenCalled();
  });

});
