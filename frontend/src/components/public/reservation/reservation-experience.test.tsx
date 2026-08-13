import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReservationExperience } from "@/components/public/reservation/reservation-experience";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

afterEach(() => {
  cleanup();
  pushMock.mockClear();
  window.sessionStorage.clear();
});

describe("ReservationExperience", () => {
  it("builds a mock booking total from court and equipment selections", async () => {
    const user = userEvent.setup();
    render(<ReservationExperience />);

    expect(screen.queryByRole("complementary", { name: "Current booking selection" })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Select Court 1, 7:00 AM/ })[0]);

    const bookingBar = screen.getByRole("complementary", { name: "Current booking selection" });
    expect(within(bookingBar).getByText("₱500")).toBeInTheDocument();
    expect(within(bookingBar).getByText(/1 slot/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Rent equipment/ }));
    await user.click(screen.getByRole("button", { name: "Okay, I understand" }));
    await user.click(screen.getByRole("button", { name: "Add one Paddle" }));

    expect(within(bookingBar).getByText("₱600")).toBeInTheDocument();
    expect(screen.queryByText("Estimated booking summary")).not.toBeInTheDocument();

    await user.click(within(bookingBar).getByRole("button", { name: "Clear booking" }));
    expect(screen.queryByRole("complementary", { name: "Current booking selection" })).not.toBeInTheDocument();
  });

  it("opens the booking rules dialog", async () => {
    const user = userEvent.setup();
    render(<ReservationExperience />);

    await user.click(screen.getByRole("button", { name: "View booking rules" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Court rules and booking reminders" })).toBeInTheDocument();
  });

  it("shows the equipment time reminder before revealing equipment options", async () => {
    const user = userEvent.setup();
    render(<ReservationExperience />);

    await user.click(screen.getByRole("button", { name: /Rent equipment/ }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Use equipment during your reserved court time" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add one Paddle" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Okay, I understand" }));

    expect(screen.getByRole("button", { name: "Add one Paddle" })).toBeInTheDocument();
  });

  it("selects an available date when moving to another week", async () => {
    const user = userEvent.setup();
    render(<ReservationExperience />);

    await user.click(screen.getByRole("button", { name: "Next week" }));

    expect(screen.getByRole("button", { name: /Tue.*18/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Tuesday, August 18, 2026" })).toBeInTheDocument();
  });

  it("preserves the selection and opens checkout", async () => {
    const user = userEvent.setup();
    render(<ReservationExperience />);

    await user.click(screen.getAllByRole("button", { name: /Select Court 1, 7:00 AM/ })[0]);
    await user.click(screen.getByRole("button", { name: /Continue to book/ }));

    expect(window.sessionStorage.getItem("dinks-on-us:mock-reservation-draft")).toContain('"courtName":"Court 1"');
    expect(pushMock).toHaveBeenCalledWith("/reserve/checkout");
  });
});
