import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn().mockResolvedValue({ data: { id: 12 } }),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/hooks/mutations/use-reservation-mutations", () => ({
  useCreateWalkInReservation: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
}));
vi.mock("@/hooks/queries/use-court-pricing", () => ({
  useReservationOptions: () => ({
    data: {
      date: "2026-08-27",
      configuration: { additional_player_price: 100 },
      courts: [{ id: 1, name: "Court 1" }],
      slots: [{ start_hour: 9, end_hour: 10, price: 500 }],
      equipment: [{ id: 5, name: "Paddle", price: 50, total_quantity: 4, available_quantity: 4 }],
      unavailable_slots: [],
      reserved_slots: [],
      past_slots: [],
      is_date_closed: false,
    },
    isPending: false,
    isError: false,
  }),
}));
vi.mock("@/forms/reservations/reservation-form-controls", () => ({
  expandReservationRanges: (date: string, ranges: Array<{ courtId: string; slot: string }>) => ranges.flatMap((range) => range.courtId && range.slot ? [{ court_id: Number(range.courtId), date, start_hour: Number(range.slot) }] : []),
  ReservationScheduleFields: ({ setRanges }: { setRanges: (ranges: Array<{ courtId: string; slot: string }>) => void }) => <button type="button" onClick={() => setRanges([{ courtId: "1", slot: "9" }])}>Choose test slot</button>,
  ReservationQuantityStepper: ({ value, onDecrease, onIncrease, decreaseLabel, increaseLabel }: { value: number; onDecrease: () => void; onIncrease: () => void; decreaseLabel: string; increaseLabel: string }) => <div><button type="button" aria-label={decreaseLabel} onClick={onDecrease}>−</button><span>{value}</span><button type="button" aria-label={increaseLabel} onClick={onIncrease}>+</button></div>,
}));

import { WalkInReservationForm } from "@/forms/reservations/walk-in-reservation-form";

describe("WalkInReservationForm", () => {
  beforeEach(() => {
    mocks.mutateAsync.mockClear();
    mocks.push.mockClear();
  });

  it("shows the live breakdown and submits a verified walk-in payment payload", async () => {
    const user = userEvent.setup();
    render(<WalkInReservationForm />);

    await user.click(screen.getByRole("button", { name: "Choose test slot" }));
    expect(await screen.findByRole("heading", { name: "Summary breakdown" })).toBeInTheDocument();
    expect(screen.getByText(/Court 1/)).toBeInTheDocument();
    expect(screen.getAllByText("₱500.00")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Add one additional player" }));
    await user.click(screen.getByRole("button", { name: "Add one Paddle" }));
    expect(screen.getByText("₱650.00")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Name" }), "Maria Walk In");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "maria@example.com");
    await user.type(screen.getByRole("textbox", { name: "Contact number" }), "09171234567");
    await user.click(screen.getByRole("button", { name: "Submit walk-in" }));

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(1));
    expect(mocks.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      customer_name: "Maria Walk In",
      customer_email: "maria@example.com",
      customer_contact_number: "09171234567",
      slots: [expect.objectContaining({ court_id: 1, start_hour: 9 })],
      equipment: [{ id: 5, quantity: 1 }],
      additional_players: 1,
      payment_channel: "CASH",
      payment_reference_number: undefined,
      payment_proof: undefined,
    }));
    expect(mocks.push).toHaveBeenCalledWith("/portal/reservations");
  });
});
