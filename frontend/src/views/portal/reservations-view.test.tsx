import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reservationKeys } from "@/config/query-keys";
import type { ApiResponse } from "@/types/api";
import type { ManagementReservation, ReservationFilters, ReservationListData } from "@/types/reservation";

const { getReservationsMock } = vi.hoisted(() => ({ getReservationsMock: vi.fn() }));

vi.mock("@/services/reservations/reservation-service", () => ({ getReservations: getReservationsMock }));
vi.mock("@/hooks/queries/use-current-user", () => ({ useCurrentUser: () => ({ data: { role: { is_full_access: true } } }) }));
vi.mock("@/hooks/mutations/use-reservation-mutations", () => ({
  useVerifyReservation: () => ({ mutate: vi.fn(), isPending: false }),
  useStartReservation: () => ({ mutate: vi.fn(), isPending: false }),
  useNoShowReservation: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/forms/reservations/reservation-dialogs", () => ({
  AddOnsDialog: () => null,
  CancelReservationDialog: () => null,
  CompleteReservationDialog: () => null,
  RejectReservationDialog: () => null,
  ReservationDetailDialog: () => null,
  RescheduleReservationDialog: () => null,
}));

import { ReservationsView } from "@/views/portal/reservations-view";

function booking(id: number): ManagementReservation {
  return {
    id, reference_number: `RF-${id}`, source: "ONLINE", booking_date: "2026-10-21",
    customer: { name: `Player ${id}`, email: "player@example.com", contact_number: "09123456789" },
    status: "PENDING", display_status: "PENDING", is_rescheduled: false, reschedule_count: 0,
    amounts: { original: 500, adjustments: 0, final: 500, paid: 0, outstanding: 500, refundable_credit: 0 },
    additional_players: { original_quantity: 0, unit_amount: 100 },
    rejection: null, cancellation_reason: null, timestamps: {},
  };
}

describe("ReservationsView pagination", () => {
  let client: QueryClient;
  let remaining: ManagementReservation[];

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    remaining = Array.from({ length: 11 }, (_, index) => booking(index + 1));
    getReservationsMock.mockReset();
    getReservationsMock.mockImplementation(async (filters: ReservationFilters): Promise<ApiResponse<ReservationListData>> => ({
      success: true, message: "Reservations retrieved.", code: null, errors: null,
      data: {
        reservations: remaining.slice((filters.page - 1) * 10, filters.page * 10),
        kpis: { pending: remaining.length, verified: 0, ongoing: 0, rescheduled: 0 },
      },
      meta: { current_page: filters.page, last_page: Math.max(1, Math.ceil(remaining.length / 10)), per_page: 10, total: remaining.length },
    }));
  });

  afterEach(() => {
    cleanup();
    client.clear();
  });

  async function goToLastPage() {
    const user = userEvent.setup();
    render(<QueryClientProvider client={client}><ReservationsView /></QueryClientProvider>);
    await screen.findByText("Page 1 of 2");
    await user.click(screen.getByRole("button", { name: /^Next$/ }));
    await screen.findByText("Page 2 of 2");
    expect(screen.getAllByText("RF-11")).toHaveLength(2);
  }

  it("returns to the previous page when the last booking there is finalized", async () => {
    await goToLastPage();
    remaining = remaining.slice(0, 10);
    await client.invalidateQueries({ queryKey: reservationKeys.all });

    await waitFor(() => expect(screen.getAllByText("RF-1")).toHaveLength(2));
    expect(screen.queryByText("RF-11")).not.toBeInTheDocument();
    expect(screen.queryByText("No matching reservations")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("navigation", { name: "Pagination" })).not.toBeInTheDocument());
  });

  it("shows the empty state without repeated page changes when no bookings remain", async () => {
    await goToLastPage();
    remaining = [];
    await client.invalidateQueries({ queryKey: reservationKeys.all });

    await screen.findByText("No matching reservations");
    await waitFor(() => expect(getReservationsMock.mock.lastCall?.[0].page).toBe(1));
    expect(getReservationsMock).toHaveBeenCalledTimes(4);
  });

  it("keeps staff on the same page during refresh when that page still exists", async () => {
    await goToLastPage();
    await client.invalidateQueries({ queryKey: reservationKeys.all });

    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getAllByText("RF-11")).toHaveLength(2);
    expect(getReservationsMock.mock.lastCall?.[0].page).toBe(2);
  });
});
