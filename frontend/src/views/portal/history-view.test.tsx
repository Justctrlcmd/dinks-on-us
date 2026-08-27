import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const historyQuery = vi.hoisted(() => ({
  data: {
    data: {
      reservations: [{
        id: 101,
        reference_number: "RF-101",
        source: "ONLINE",
        booking_date: "2026-08-27",
        customer: { name: "Jamie Cruz", email: "jamie@example.com", contact_number: "09123456789" },
        status: "COMPLETED",
        display_status: "COMPLETED",
        is_rescheduled: false,
        reschedule_count: 0,
        amounts: { original: 500, adjustments: 0, final: 500, paid: 500, outstanding: 0, refundable_credit: 0 },
        additional_players: { original_quantity: 0, unit_amount: 100 },
        rejection: null,
        cancellation_reason: null,
        timestamps: {},
      }],
      kpis: { completed: 8, cancelled: 3, rejected: 2, no_show: 1 },
    },
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
  },
  isPending: false,
  isError: false,
  refetch: vi.fn(),
}));

vi.mock("@/hooks/queries/use-history", () => ({ useHistory: () => historyQuery }));
vi.mock("@/forms/reservations/reservation-dialogs", () => ({
  ReservationDetailDialog: ({ open, reservation, source }: { open: boolean; reservation: { reference_number: string } | null; source: string }) =>
    open ? <div>{source} detail for {reservation?.reference_number}</div> : null,
}));

import { HistoryView } from "@/views/portal/history-view";

describe("HistoryView", () => {
  beforeEach(() => historyQuery.refetch.mockReset());

  it("shows the four final-status KPIs and only a View row action", async () => {
    const user = userEvent.setup();
    render(<HistoryView />);

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(screen.getByText("No-show")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();

    const viewActions = screen.getAllByRole("button", { name: "View RF-101" });
    expect(viewActions).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /verify|reject|cancel|complete/i })).not.toBeInTheDocument();

    await user.click(viewActions[0]);
    expect(screen.getByText("history detail for RF-101")).toBeInTheDocument();
  });
});
