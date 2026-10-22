import { QueryClient, QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { dashboardKeys, reservationKeys } from "@/config/query-keys";
import type { ManagementReservation } from "@/types/reservation";
import type { ApiResponse } from "@/types/api";

const { getReservation, reschedule } = vi.hoisted(() => ({ getReservation: vi.fn(), reschedule: vi.fn() }));
vi.mock("@/services/reservations/reservation-service", () => ({ getReservation, rescheduleReservation: reschedule }));
vi.mock("@/hooks/queries/use-court-pricing", () => ({
  useReservationOptions: (date: string) => ({ data: {
    date, configuration: { additional_player_price: 100 },
    courts: [{ id: 1, name: "Court 1", court_number: 1 }],
    slots: [{ start_hour: 17, end_hour: 18, price: 100 }, { start_hour: 18, end_hour: 19, price: 100 }],
    equipment: [], is_date_closed: false, past_slots: [], unavailable_slots: [],
  }, isPending: false, isError: false }),
  useReservationClosedDates: () => ({ data: [] }),
}));
vi.mock("@/hooks/queries/use-payment-methods", () => ({ usePublicPaymentMethods: () => ({ data: [] }) }));
import { RescheduleReservationDialog } from "./reservation-dialogs";

const booking: ManagementReservation = {
  id: 8, revision: 3, reference_number: "RF-008", source: "ONLINE", booking_date: "2026-10-23",
  customer: { name: "Player", email: "player@example.com", contact_number: "09123456789" },
  status: "VERIFIED", display_status: "VERIFIED", is_rescheduled: false, reschedule_count: 0,
  amounts: { original: 100, adjustments: 0, final: 100, paid: 100, outstanding: 0, refundable_credit: 0 },
  slots: [{ id: 1, court_id: 1, court_name: "Court 1", date: "2026-10-23", start_hour: 17, end_hour: 18, amount: 100, kind: "ORIGINAL" }],
  additional_players: { original_quantity: 0, unit_amount: 100 }, equipment: [], adjustments: [],
  rejection: null, cancellation_reason: null, timestamps: {},
};
const updated: ManagementReservation = { ...booking, booking_date: "2026-10-22", revision: 4, reschedule_count: 1, display_status: "RESCHEDULED", is_rescheduled: true,
  slots: [{ ...booking.slots![0], date: "2026-10-22", id: 2, start_hour: 18, end_hour: 19, kind: "RESCHEDULED" }],
};
function Harness() {
  const [open, setOpen] = useState(true);
  return <><span>{open ? "Reschedule open" : "Reschedule closed"}</span><RescheduleReservationDialog reservation={booking} open={open} onOpenChange={setOpen} /></>;
}
const clients: QueryClient[] = [];
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-22T05:00:00Z"));
  getReservation.mockResolvedValue({ data: booking });
});
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0; vi.resetAllMocks(); vi.useRealTimers(); });
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>);
  return client;
}
async function confirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Time slots" }));
  await user.click(screen.getByRole("checkbox", { name: "5:00 PM – 6:00 PM" }));
  await user.click(screen.getByRole("checkbox", { name: "6:00 PM – 7:00 PM" }));
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: "Review reschedule" }));
  await user.click(screen.getByRole("button", { name: "Confirm reschedule" }));
}

it("closes both dialogs on committed success even while dashboard refresh is unfinished", async () => {
  const user = userEvent.setup();
  let save!: (value: ApiResponse<ManagementReservation>) => void;
  reschedule.mockImplementation(() => new Promise((resolve) => { save = resolve; }));
  const client = setup();
  const dashboardKey = [...dashboardKeys.all, "slow-refresh"];
  client.setQueryData(dashboardKey, { version: 1 });
  let finishDashboard!: (value: { version: number }) => void;
  const refresh = vi.fn(() => new Promise<{ version: number }>((resolve) => { finishDashboard = resolve; }));
  const observer = new QueryObserver(client, { queryKey: dashboardKey, queryFn: refresh, staleTime: Infinity });
  const unsubscribe = observer.subscribe(() => {});
  await confirm(user);
  await waitFor(() => expect(reschedule).toHaveBeenCalledOnce());
  expect(screen.getByText("Reschedule open")).toBeInTheDocument();
  getReservation.mockResolvedValue({ data: updated });
  await act(async () => { save({ success: true, message: "Reservation rescheduled.", data: updated, code: null, errors: null, meta: null }); });
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.getByText("Reschedule closed")).toBeInTheDocument());
  expect(screen.queryByRole("button", { name: "Review reschedule" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Confirm reschedule" })).not.toBeInTheDocument();
  expect(client.getQueryData(reservationKeys.detail(8))).toEqual(updated);
  await act(async () => { finishDashboard({ version: 2 }); });
  await waitFor(() => expect(client.getMutationCache().getAll()[0].state.status).toBe("success"));
  expect(client.getQueryData(dashboardKey)).toEqual({ version: 2 });
  unsubscribe();
});

it("keeps the reschedule form open when the save fails", async () => {
  const user = userEvent.setup();
  reschedule.mockRejectedValue(new Error("Save failed"));
  setup();
  await confirm(user);
  await waitFor(() => expect(screen.getByRole("button", { name: "Review reschedule" })).toBeEnabled());
  expect(screen.getByText("Reschedule open")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Confirm reschedule" })).not.toBeInTheDocument();
});
