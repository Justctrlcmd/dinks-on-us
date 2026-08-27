import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { dashboardQuery, useDashboardMock } = vi.hoisted(() => ({
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
}));
vi.mock("@/forms/reservations/reservation-dialogs", () => ({
  ReservationDetailDialog: ({ open, reservationId, source }: { open: boolean; reservationId?: number | null; source: string }) =>
    open ? <div>{source} detail for {reservationId}</div> : null,
}));

import { PortalHomeView } from "@/views/portal/portal-home-view";

describe("PortalHomeView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T03:00:00.000Z"));
    useDashboardMock.mockReturnValue(dashboardQuery);
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

  it("opens the read-only dashboard detail for an occupied slot", () => {
    render(<PortalHomeView />);

    fireEvent.click(screen.getAllByRole("button", { name: /View pending reservation RF-101/ })[0]);

    expect(screen.getByText("dashboard detail for 101")).toBeInTheDocument();
  });

  it("moves the selected date with week navigation", () => {
    render(<PortalHomeView />);

    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));

    expect(useDashboardMock).toHaveBeenLastCalledWith("2026-08-17", "2026-08-17");

    fireEvent.click(screen.getByRole("button", { name: "Next week" }));

    expect(useDashboardMock).toHaveBeenLastCalledWith("2026-08-24", "2026-08-24");
  });
});
