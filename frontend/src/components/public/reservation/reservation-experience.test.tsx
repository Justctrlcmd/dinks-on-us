import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReservationExperience } from "@/components/public/reservation/reservation-experience";

const { pushMock, reservationOptionsMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  reservationOptionsMock: {
    date: "2026-08-25",
    configuration: {
      id: 1,
      opening_hour: 7,
      closing_hour: 9,
      included_players_per_court: 4,
      additional_player_price: 100,
      weekday_rates: [{ id: 1, start_hour: 7, end_hour: 9, price: 500 }],
      weekend_rates: [{ id: 2, start_hour: 7, end_hour: 9, price: 600 }],
      created_at: "2026-08-25T00:00:00.000Z",
      updated_at: "2026-08-25T00:00:00.000Z",
    },
    courts: [{ id: 1, court_number: 1, name: "Court 1", created_at: "2026-08-25T00:00:00.000Z", updated_at: "2026-08-25T00:00:00.000Z" }],
    slots: [{ start_hour: 7, end_hour: 8, price: 500 }, { start_hour: 8, end_hour: 9, price: 500 }],
    equipment: [{ id: 1, name: "Paddle", price: 100, total_quantity: 12, available_quantity: 12, created_at: "2026-08-25T00:00:00.000Z", updated_at: "2026-08-25T00:00:00.000Z" }],
    equipment_confirmation: "Equipment availability is confirmed when your reservation is verified.",
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/hooks/queries/use-policies", () => ({
  usePublicPolicies: () => ({ data: [], isPending: false, isError: false }),
}));

vi.mock("@/hooks/queries/use-court-pricing", () => ({
  useReservationOptions: () => ({
    data: reservationOptionsMock,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  pushMock.mockClear();
  window.sessionStorage.clear();
});

describe("ReservationExperience", () => {
  it("builds a reservation total from court, player, and equipment selections", async () => {
    const user = userEvent.setup();
    render(<ReservationExperience />);

    expect(screen.queryByRole("complementary", { name: "Current reservation selection" })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Select Court 1, 7:00 AM/ })[0]);

    const reservationBar = screen.getByRole("complementary", { name: "Current reservation selection" });
    expect(within(reservationBar).getByText("₱500")).toBeInTheDocument();
    expect(within(reservationBar).getByText(/1 slot/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Rent equipment/ }));
    await user.click(screen.getByRole("button", { name: "Okay, I understand" }));
    await user.click(screen.getByRole("button", { name: "Add one Paddle" }));

    await user.click(screen.getByRole("button", { name: "Add one additional player" }));

    expect(within(reservationBar).getByText("₱700")).toBeInTheDocument();
    expect(screen.queryByText("Estimated reservation summary")).not.toBeInTheDocument();

    await user.click(within(reservationBar).getByRole("button", { name: "Clear reservation" }));
    expect(screen.queryByRole("complementary", { name: "Current reservation selection" })).not.toBeInTheDocument();
  });

  it("opens the reservation rules dialog", async () => {
    const user = userEvent.setup();
    render(<ReservationExperience />);

    await user.click(screen.getByRole("button", { name: "View reservation rules" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Court rules and reservation reminders" })).toBeInTheDocument();
  });

  it("shows the equipment time reminder before revealing equipment options", async () => {
    const user = userEvent.setup();
    render(<ReservationExperience />);

    await user.click(screen.getByRole("button", { name: /Rent equipment/ }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Equipment is confirmed during verification" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add one Paddle" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Okay, I understand" }));

    expect(screen.getByRole("button", { name: "Add one Paddle" })).toBeInTheDocument();
  });

  it("selects an available date when moving to another week", async () => {
    const user = userEvent.setup();
    render(<ReservationExperience />);

    await user.click(screen.getByRole("button", { name: "Next week" }));

    expect(screen.getByRole("button", { name: /Mon.*31/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Monday, August 31, 2026" })).toBeInTheDocument();
  });

  it("preserves the selection and opens checkout", async () => {
    const user = userEvent.setup();
    render(<ReservationExperience />);

    await user.click(screen.getAllByRole("button", { name: /Select Court 1, 7:00 AM/ })[0]);
    await user.click(screen.getByRole("button", { name: /Continue to reservation/ }));

    expect(window.sessionStorage.getItem("dinks-on-us:reservation-draft")).toContain('"courtName":"Court 1"');
    expect(pushMock).toHaveBeenCalledWith("/reserve/checkout");
  });
});
