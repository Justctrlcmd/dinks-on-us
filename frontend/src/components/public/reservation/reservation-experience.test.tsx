import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReservationExperience } from "@/components/public/reservation/reservation-experience";

const { closedDatesMock, policySectionsMock, pushMock, reservationOptionsMock } = vi.hoisted(() => ({
  closedDatesMock: [] as string[],
  policySectionsMock: [
    { id: 1, slug: "reservation-rules", name: "Reservation Rules & Policy", subheaders: [{ id: 11, title: "Reservation submission", rules: [{ id: 111, content: "Reservations are subject to availability." }] }] },
    { id: 2, slug: "court-rules", name: "Court Rules & Policy", subheaders: [{ id: 21, title: "Court use", rules: [{ id: 211, content: "Use the court responsibly." }] }] },
    { id: 3, slug: "reschedule-policy", name: "Reschedule Policy", subheaders: [{ id: 31, title: "Rescheduling", rules: [{ id: 311, content: "Requests are subject to approval." }] }] },
    { id: 4, slug: "cancellation-policy", name: "Cancellation Policy", subheaders: [{ id: 41, title: "Cancellations", rules: [{ id: 411, content: "Confirmed reservations follow the cancellation policy." }] }] },
  ],
  pushMock: vi.fn(),
  reservationOptionsMock: {
    date: "2026-08-25",
    configuration: {
      id: 1,
      opening_hour: 7,
      closing_hour: 9,
      included_players_per_court: 4,
      additional_player_price: 100,
      advance_booking_days: 30,
      weekday_rates: [{ id: 1, start_hour: 7, end_hour: 9, price: 500 }],
      weekend_rates: [{ id: 2, start_hour: 7, end_hour: 9, price: 600 }],
      created_at: "2026-08-25T00:00:00.000Z",
      updated_at: "2026-08-25T00:00:00.000Z",
    },
    courts: [{ id: 1, court_number: 1, name: "Court 1", created_at: "2026-08-25T00:00:00.000Z", updated_at: "2026-08-25T00:00:00.000Z" }],
    slots: [{ start_hour: 7, end_hour: 8, price: 500 }, { start_hour: 8, end_hour: 9, price: 500 }],
    is_outside_booking_window: false,
    booking_window_end: "2026-09-24",
    is_date_closed: false,
    unavailable_slots: [] as { court_id: number; start_hour: number }[],
    reserved_slots: [] as { court_id: number; start_hour: number }[],
    past_slots: [] as { court_id: number; start_hour: number }[],
    equipment: [{ id: 1, name: "Paddle", price: 100, total_quantity: 12, is_active: true, available_quantity: 12, slot_availability: [7, 8].map((hour) => ({ date: "2026-08-25", start_hour: hour, end_hour: hour + 1, available_quantity: hour === 7 ? 12 : 2 })), created_at: "2026-08-25T00:00:00.000Z", updated_at: "2026-08-25T00:00:00.000Z" }],
    equipment_confirmation: "Equipment is held when your reservation is successfully submitted, including while awaiting verification.",
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/date", async () => {
  const actual = await vi.importActual<typeof import("@/lib/date")>("@/lib/date");
  return { ...actual, todayInTimeZone: () => "2026-08-25" };
});

vi.mock("@/hooks/queries/use-policies", () => ({
  usePublicPolicies: () => ({ data: policySectionsMock, isPending: false, isError: false }),
}));

vi.mock("@/hooks/queries/use-court-pricing", () => ({
  useReservationClosedDates: () => ({ data: closedDatesMock, isPending: false, isError: false }),
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
  reservationOptionsMock.is_date_closed = false;
  reservationOptionsMock.is_outside_booking_window = false;
  reservationOptionsMock.booking_window_end = "2026-09-24";
  reservationOptionsMock.unavailable_slots.length = 0;
  reservationOptionsMock.reserved_slots.length = 0;
  reservationOptionsMock.past_slots.length = 0;
  closedDatesMock.length = 0;
  reservationOptionsMock.equipment[0].slot_availability[0].available_quantity = 12;
});

describe("ReservationExperience", () => {
  it("builds a reservation total from court, player, and equipment selections", async () => {
    const user = userEvent.setup();
    render(<ReservationExperience />);

    expect(screen.queryByRole("complementary", { name: "Current reservation selection" })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Select Court 1, 7:00 AM/ })[0]);

    const reservationBar = screen.getByRole("complementary", { name: "Current reservation selection" });
    expect(reservationBar.parentElement).toBe(document.body);
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

  it("opens the Reservation Rules & Policy dialog", async () => {
    const user = userEvent.setup();
    render(<ReservationExperience />);

    await user.click(screen.getByRole("button", { name: "Review the rules" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("dialog").scrollTop).toBe(0);
    expect(screen.getByRole("heading", { name: "Reservation Rules & Policy" })).toBeInTheDocument();
  });

  it("switches between related policies inside the dialog", async () => {
    const user = userEvent.setup();
    render(<ReservationExperience />);

    await user.click(screen.getByRole("button", { name: "Review the rules" }));
    const dialog = screen.getByRole("dialog");
    dialog.scrollTop = 500;
    await user.click(screen.getByRole("button", { name: "Review Court Rules & Policy" }));

    expect(dialog).toBeInTheDocument();
    expect(dialog.scrollTop).toBe(0);
    expect(screen.getByRole("heading", { name: "Court Rules & Policy" })).toBeInTheDocument();
    expect(screen.getByText("Use the court responsibly.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Review Reschedule Policy" }));
    expect(screen.getByRole("heading", { name: "Reschedule Policy" })).toBeInTheDocument();
    expect(screen.getByText("Requests are subject to approval.")).toBeInTheDocument();
  });

  it("opens the policy dialog at the top", async () => {
    const user = userEvent.setup();
    render(<ReservationExperience />);

    await user.click(screen.getByRole("button", { name: "Review the rules" }));
    const dialog = screen.getByRole("dialog");
    dialog.scrollTop = 500;
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Review the rules" }));

    expect(screen.getByRole("dialog").scrollTop).toBe(0);
  });

  it("disables equipment when the selected schedule has no stock", async () => {
    reservationOptionsMock.equipment[0].slot_availability[0].available_quantity = 0;
    const user = userEvent.setup();
    render(<ReservationExperience />);
    await user.click(screen.getAllByRole("button", { name: /Select Court 1, 7:00 AM/ })[0]);
    await user.click(screen.getByRole("button", { name: /Rent equipment/ }));
    await user.click(screen.getByRole("button", { name: "Okay, I understand" }));
    expect(screen.getByText("Unavailable for selected schedule")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add one Paddle" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove one Paddle" })).toBeDisabled();
  });

  it("caps equipment at the minimum for the selected hours and saves the corrected quantity", async () => {
    const user = userEvent.setup();
    render(<ReservationExperience />);
    await user.click(screen.getAllByRole("button", { name: /Select Court 1, 7:00 AM/ })[0]);
    await user.click(screen.getByRole("button", { name: /Rent equipment/ }));
    await user.click(screen.getByRole("button", { name: "Okay, I understand" }));
    const increase = screen.getByRole("button", { name: "Add one Paddle" });
    for (let i = 0; i < 4; i++) await user.click(increase);
    await user.click(screen.getAllByRole("button", { name: /Select Court 1, 8:00 AM/ })[0]);
    expect(screen.getByText("2 available for your selected schedule")).toBeInTheDocument();
    expect(increase).toBeDisabled();
    await user.click(screen.getAllByRole("button", { name: /Remove Court 1, 8:00 AM/ })[0]);
    expect(increase).not.toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Continue to reservation" }));
    const draft = JSON.parse(window.sessionStorage.getItem("dinks-on-us:reservation-draft")!);
    expect(draft.equipment[0].quantity).toBe(2);
  });

  it("shows the equipment time reminder before revealing equipment options", async () => {
    const user = userEvent.setup();
    render(<ReservationExperience />);

    await user.click(screen.getByRole("button", { name: /Rent equipment/ }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Equipment is held when you submit" })).toBeInTheDocument();
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

  it("does not allow public date selection after the configured booking window", async () => {
    const user = userEvent.setup();
    render(<ReservationExperience />);

    expect(screen.getByText("Online bookings are available through Thursday, September 24, 2026.")).toBeInTheDocument();
    for (let week = 0; week < 4; week += 1) await user.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByRole("button", { name: "Fri 25, outside online booking window" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next week" })).toBeDisabled();
  });

  it("preserves the selection and opens checkout", async () => {
    const user = userEvent.setup();
    render(<ReservationExperience />);

    await user.click(screen.getAllByRole("button", { name: /Select Court 1, 7:00 AM/ })[0]);
    await user.click(screen.getByRole("button", { name: /Continue to reservation/ }));

    expect(window.sessionStorage.getItem("dinks-on-us:reservation-draft")).toContain('"courtName":"Court 1"');
    expect(pushMock).toHaveBeenCalledWith("/reserve/checkout");
  });

  it("locks the date selector after the first slot and unlocks it when cleared", async () => {
    const user = userEvent.setup();
    render(<ReservationExperience />);

    await user.click(screen.getAllByRole("button", { name: /Select Court 1, 7:00 AM/ })[0]);

    expect(screen.getByRole("button", { name: "Next week" })).toBeDisabled();
    const reservationBar = screen.getByRole("complementary", { name: "Current reservation selection" });
    await user.click(within(reservationBar).getByRole("button", { name: "Clear reservation" }));
    expect(screen.getByRole("button", { name: "Next week" })).toBeEnabled();
  });

  it("marks a blocked court time as unavailable", () => {
    reservationOptionsMock.unavailable_slots.push({ court_id: 1, start_hour: 7 });
    render(<ReservationExperience />);

    screen.getAllByRole("button", { name: "Court 1, 7:00 AM – 8:00 AM, closed" }).forEach((slot) => expect(slot).toBeDisabled());
  });

  it("marks a reserved court time as reserved", () => {
    reservationOptionsMock.unavailable_slots.push({ court_id: 1, start_hour: 7 });
    reservationOptionsMock.reserved_slots.push({ court_id: 1, start_hour: 7 });
    render(<ReservationExperience />);

    screen.getAllByRole("button", { name: "Court 1, 7:00 AM – 8:00 AM, reserved" }).forEach((slot) => {
      expect(slot).toBeDisabled();
      expect(slot).toHaveTextContent("Reserved");
    });
  });

  it("marks a court time that has ended as past", () => {
    reservationOptionsMock.unavailable_slots.push({ court_id: 1, start_hour: 7 });
    reservationOptionsMock.past_slots.push({ court_id: 1, start_hour: 7 });
    render(<ReservationExperience />);

    screen.getAllByRole("button", { name: "Court 1, 7:00 AM – 8:00 AM, past" }).forEach((slot) => {
      expect(slot).toBeDisabled();
      expect(slot).toHaveTextContent("Past");
    });
  });

  it("disables whole-operation closed dates without highlighting today", () => {
    closedDatesMock.push("2026-08-26");
    render(<ReservationExperience />);

    expect(screen.getByRole("button", { name: "Wed 26, Closed" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Tue 25" })).not.toHaveClass("bg-primary");
  });
});
