import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReservationCheckout } from "@/components/public/reservation/reservation-checkout";
import { RESERVATION_DRAFT_STORAGE_KEY } from "@/types/reservation";

vi.mock("@/hooks/queries/use-policies", () => ({
  usePublicPolicies: () => ({ data: [], isPending: false, isError: false }),
}));

beforeEach(() => {
  window.sessionStorage.setItem(
    RESERVATION_DRAFT_STORAGE_KEY,
    JSON.stringify({
      selectedSlots: [
        { courtId: 1, courtName: "Court 1", date: "2026-08-13", startHour: 7, endHour: 8, available: true, price: 500 },
      ],
      equipment: [{ id: 1, name: "Paddle", price: 100, quantity: 1 }],
      additionalPlayers: 1,
      additionalPlayerUnitPrice: 100,
      includedPlayersPerCourt: 4,
    }),
  );
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("ReservationCheckout", () => {
  it("shows the full cost breakdown and enables submission after acknowledgment", async () => {
    const user = userEvent.setup();
    render(<ReservationCheckout />);

    const summary = screen.getByRole("heading", { name: "1 court slot" }).closest("section");
    expect(summary).not.toBeNull();
    expect(within(summary!).getByText("Court 1")).toBeInTheDocument();
    expect(within(summary!).getByText("Paddle × 1")).toBeInTheDocument();
    expect(within(summary!).getByText("₱700", { selector: "dd" })).toBeInTheDocument();

    const submit = screen.getByRole("button", { name: "Submit reservation" });
    expect(submit).toBeDisabled();

    expect(screen.getByRole("combobox", { name: "E-wallet or bank" })).toHaveTextContent("GCash");

    await user.click(screen.getByRole("checkbox", { name: /Reservation acknowledgment/ }));
    expect(submit).toBeEnabled();
  });

  it("shows an empty state when checkout is opened without a selection", () => {
    window.sessionStorage.clear();
    render(<ReservationCheckout />);

    expect(screen.getByRole("heading", { name: "No reservation selected yet" })).toBeInTheDocument();
  });
});
