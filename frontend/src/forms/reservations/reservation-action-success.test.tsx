import { QueryClient, QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { dashboardKeys, reservationKeys } from "@/config/query-keys";
import type { ApiResponse } from "@/types/api";
import type { ManagementReservation } from "@/types/reservation";

const { getReservation, save } = vi.hoisted(() => ({ getReservation: vi.fn(), save: vi.fn() }));
vi.mock("@/services/reservations/reservation-service", () => ({
  getReservation, completeReservation: save, cancelReservation: save, addReservationAddOns: save,
}));
vi.mock("@/hooks/queries/use-court-pricing", () => ({
  useReservationOptions: (date: string) => ({ data: { date, configuration: { additional_player_price: 100 }, courts: [], slots: [], equipment: [], past_slots: [], unavailable_slots: [] }, isError: false }),
}));
vi.mock("@/hooks/queries/use-payment-methods", () => ({ usePublicPaymentMethods: () => ({ data: [] }) }));
import { AddOnsDialog, CancelReservationDialog, CompleteReservationDialog } from "./reservation-dialogs";

const original: ManagementReservation = {
  id: 8, revision: 3, reference_number: "RF-008", source: "ONLINE", booking_date: "2026-10-23",
  customer: { name: "Player", email: "player@example.com", contact_number: "09123456789" },
  status: "ONGOING", display_status: "ONGOING", is_rescheduled: false, reschedule_count: 0,
  amounts: { original: 100, adjustments: 0, final: 100, paid: 100, outstanding: 0, refundable_credit: 0 },
  additional_players: { original_quantity: 0, unit_amount: 100 }, slots: [], equipment: [], adjustments: [],
  rejection: null, cancellation_reason: null, timestamps: {},
};
const clients: QueryClient[] = [];
beforeEach(() => { getReservation.mockResolvedValue({ data: original }); });
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0; vi.resetAllMocks(); });
type Kind = "complete" | "cancel" | "addons";
const labels = { complete: ["Review completion", "Complete reservation"], cancel: ["Review cancellation", "Cancel reservation"], addons: ["Review add-ons", "Confirm add-ons"] } as const;
function setup(kind: Kind, booking = original) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  getReservation.mockResolvedValue({ data: booking });
  function Harness() {
    const [open, setOpen] = useState(true);
    const Component = kind === "complete" ? CompleteReservationDialog : kind === "cancel" ? CancelReservationDialog : AddOnsDialog;
    return <><span>{open ? "Action open" : "Action closed"}</span><Component reservation={booking} open={open} onOpenChange={setOpen} /></>;
  }
  render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>);
  return client;
}
async function confirm(kind: Kind, user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("button", { name: labels[kind][0] });
  if (kind === "cancel") await user.type(screen.getByLabelText(/Cancellation reason/), "Court flooding");
  if (kind === "addons") await user.click(screen.getByRole("button", { name: "Add one additional player" }));
  await user.click(screen.getByRole("button", { name: labels[kind][0] }));
  await user.click(screen.getByRole("button", { name: labels[kind][1] }));
}

it.each(["complete", "cancel", "addons"] as const)("closes %s immediately on success without showing a changed-status error", async (kind) => {
  const user = userEvent.setup();
  let commit!: (response: ApiResponse<ManagementReservation>) => void;
  save.mockImplementation(() => new Promise((resolve) => { commit = resolve; }));
  const booking: ManagementReservation = { ...original,
    status: kind === "complete" ? "ONGOING" : "VERIFIED",
    amounts: kind === "addons" ? { ...original.amounts, paid: 200, refundable_credit: 100 } : original.amounts,
  };
  const updated: ManagementReservation = { ...booking, revision: 4,
    status: kind === "complete" ? "COMPLETED" : kind === "cancel" ? "CANCELLED" : "VERIFIED",
    amounts: kind === "addons" ? { ...booking.amounts, final: 200, adjustments: 100, refundable_credit: 0 } : booking.amounts,
  };
  const client = setup(kind, booking);
  const dashboardKey = [...dashboardKeys.all, "slow-finalization-refresh"];
  client.setQueryData(dashboardKey, { version: 1 });
  let finish!: (value: { version: number }) => void;
  const refresh = vi.fn(() => new Promise<{ version: number }>((resolve) => { finish = resolve; }));
  const observer = new QueryObserver(client, { queryKey: dashboardKey, queryFn: refresh, staleTime: Infinity });
  const unsubscribe = observer.subscribe(() => {});
  await confirm(kind, user);
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(screen.getByText("Action open")).toBeInTheDocument();
  getReservation.mockResolvedValue({ data: updated });
  await act(async () => { commit({ success: true, message: "Saved.", data: updated, code: null, errors: null, meta: null }); });
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.getByText("Action closed")).toBeInTheDocument());
  expect(screen.queryByText("This action is no longer available for this reservation.")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: labels[kind][0] })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: labels[kind][1] })).not.toBeInTheDocument();
  expect(client.getQueryData(reservationKeys.detail(8))).toEqual(updated);
  await act(async () => { finish({ version: 2 }); });
  await waitFor(() => expect(client.getMutationCache().getAll()[0].state.status).toBe("success"));
  unsubscribe();
});

it("keeps completion open for correction after a failed save", async () => {
  const user = userEvent.setup();
  save.mockRejectedValue(new Error("Save failed"));
  setup("complete");
  await confirm("complete", user);
  await waitFor(() => expect(screen.getByRole("button", { name: "Review completion" })).toBeEnabled());
  expect(screen.getByText("Action open")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Complete reservation" })).not.toBeInTheDocument();
});
