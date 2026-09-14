import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReservationScheduleFields, type ReservationSlotSelection } from "@/forms/reservations/reservation-form-controls";

const options = {
  date: "2026-08-27",
  configuration: null,
  courts: [{ id: 1, court_number: 1, name: "Court 1", created_at: "", updated_at: "" }],
  slots: [
    { start_hour: 9, end_hour: 10, price: 500 },
    { start_hour: 10, end_hour: 11, price: 500 },
    { start_hour: 11, end_hour: 12, price: 500 },
  ],
  is_date_closed: false,
  unavailable_slots: [{ court_id: 1, start_hour: 10 }],
  reserved_slots: [{ court_id: 1, start_hour: 10 }],
  past_slots: [],
  equipment: [],
  equipment_confirmation: "",
};

vi.mock("@/hooks/queries/use-court-pricing", () => ({
  useReservationOptions: () => ({ data: options, isPending: false, isError: false }),
  useReservationClosedDates: () => ({ data: [], isPending: false, isError: false }),
}));

function ScheduleHarness() {
  const [ranges, setRanges] = useState<ReservationSlotSelection[]>([{ courtId: "1", slots: [] }]);
  return <ReservationScheduleFields date="2026-08-27" setDate={vi.fn()} ranges={ranges} setRanges={setRanges} />;
}

function LimitedScheduleHarness() {
  const [ranges, setRanges] = useState<ReservationSlotSelection[]>([{ courtId: "1", slots: [] }]);
  return <ReservationScheduleFields date="2026-08-27" setDate={vi.fn()} ranges={ranges} setRanges={setRanges} maxSelectedSlots={1} />;
}

afterEach(cleanup);

describe("ReservationScheduleFields", () => {
  it("allows multiple time slots to be selected from one court row", async () => {
    const user = userEvent.setup();
    render(<ScheduleHarness />);

    await user.click(screen.getByRole("button", { name: "Time slots" }));
    await user.click(screen.getByRole("checkbox", { name: "9:00 AM – 10:00 AM" }));
    await user.click(screen.getByRole("checkbox", { name: "11:00 AM – 12:00 PM" }));

    expect(screen.getByRole("button", { name: "Time slots" })).toHaveTextContent("2 time slots selected");
    expect(screen.getByRole("checkbox", { name: "10:00 AM – 11:00 AM" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByText("Closed")).not.toBeInTheDocument();
    expect(screen.queryByText("Reserved")).not.toBeInTheDocument();
  });

  it("disables extra choices after the reschedule maximum is reached", async () => {
    const user = userEvent.setup();
    render(<LimitedScheduleHarness />);

    await user.click(screen.getByRole("button", { name: "Time slots" }));
    await user.click(screen.getByRole("checkbox", { name: "9:00 AM – 10:00 AM" }));

    expect(screen.getByRole("checkbox", { name: "9:00 AM – 10:00 AM" })).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("checkbox", { name: "11:00 AM – 12:00 PM" })).toHaveAttribute("aria-disabled", "true");
  });
});
