import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AvailabilityClosureFormDialog } from "./availability-closure-form-dialog";

vi.mock("@/hooks/mutations/use-availability-closure-mutations", () => ({
  useCloseEntireOperation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCloseCourtTimes: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/queries/use-court-pricing", () => ({
  useReservationClosedDates: () => ({ data: [], isPending: false, isError: false }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AvailabilityClosureFormDialog", () => {
  it("keeps the entire-operation form content-sized on mobile", () => {
    render(
      <AvailabilityClosureFormDialog
        open
        onOpenChange={vi.fn()}
        configuration={null}
        courts={[]}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveClass("max-h-none", "overflow-visible", "p-3");
    expect(screen.getByRole("dialog")).not.toHaveClass("overflow-y-auto");
  });

  it("keeps the court selector controlled while choosing a court", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <AvailabilityClosureFormDialog
        open
        onOpenChange={vi.fn()}
        configuration={{
          id: 1,
          opening_hour: 7,
          closing_hour: 24,
          included_players_per_court: 4,
          additional_player_price: 100,
          weekday_rates: [{ start_hour: 7, end_hour: 24, price: 500 }],
          weekend_rates: [{ start_hour: 7, end_hour: 24, price: 600 }],
          created_at: "2026-08-25T00:00:00Z",
          updated_at: "2026-08-25T00:00:00Z",
        }}
        courts={[{ id: 1, court_number: 1, name: "Court 1", created_at: "2026-08-25T00:00:00Z", updated_at: "2026-08-25T00:00:00Z" }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /close specific court times/i }));
    await user.click(screen.getByRole("combobox", { name: "Court" }));
    await user.click(await screen.findByRole("option", { name: "Court 1" }));

    expect(consoleError.mock.calls.flat().join(" ")).not.toContain("changing the uncontrolled value state of Select to be controlled");
    consoleError.mockRestore();
  });
});
