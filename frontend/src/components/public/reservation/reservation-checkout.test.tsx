import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReservationCheckout } from "@/components/public/reservation/reservation-checkout";
import { MOCK_RESERVATION_STORAGE_KEY } from "@/config/mock-reservation";

beforeEach(() => {
  window.sessionStorage.setItem(
    MOCK_RESERVATION_STORAGE_KEY,
    JSON.stringify({
      selectedSlots: [
        { courtId: 1, courtName: "Court 1", date: "2026-08-13", startHour: 7, endHour: 8, available: true, price: 500 },
      ],
      equipmentQuantities: { paddle: 1, ball: 0, "titan-machine": 0 },
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
  it("shows the full mock cost breakdown and enables submission after acknowledgment", async () => {
    const user = userEvent.setup();
    render(<ReservationCheckout />);

    const summary = screen.getByRole("heading", { name: "1 court slot" }).closest("section");
    expect(summary).not.toBeNull();
    expect(within(summary!).getByText("Court 1")).toBeInTheDocument();
    expect(within(summary!).getByText("Paddle × 1")).toBeInTheDocument();
    expect(within(summary!).getByText("₱600", { selector: "dd" })).toBeInTheDocument();

    const submit = screen.getByRole("button", { name: "Submit reservation" });
    expect(submit).toBeDisabled();

    expect(screen.getByRole("combobox", { name: "E-wallet or bank" })).toHaveTextContent("GCash");

    await user.click(screen.getByRole("checkbox", { name: /Booking acknowledgment/ }));
    expect(submit).toBeEnabled();
  });

  it("shows an empty state when checkout is opened without a selection", () => {
    window.sessionStorage.clear();
    render(<ReservationCheckout />);

    expect(screen.getByRole("heading", { name: "No booking selected yet" })).toBeInTheDocument();
  });
});
