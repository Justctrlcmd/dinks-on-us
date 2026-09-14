import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemedCalendar } from "./calendar-date-picker";

afterEach(cleanup);

describe("ThemedCalendar", () => {
  it("disables and labels whole-operation closed dates", () => {
    render(<ThemedCalendar value="2026-08-25" min="2026-08-25" disabledDates={["2026-08-26"]} onChange={vi.fn()} />);

    expect(screen.getByRole("gridcell", { name: "Wednesday, August 26, 2026, Closed" })).toBeDisabled();
    expect(screen.getByRole("gridcell", { name: "Tuesday, August 25, 2026" })).not.toHaveClass("bg-primary");
  });

  it("selects an available date", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ThemedCalendar value="2026-08-25" min="2026-08-25" disabledDates={["2026-08-26"]} onChange={onChange} />);

    await user.click(screen.getByRole("gridcell", { name: "Thursday, August 27, 2026" }));

    expect(onChange).toHaveBeenCalledWith("2026-08-27");
  });

  it("disables dates after the configured maximum", () => {
    render(<ThemedCalendar value="2026-08-25" max="2026-08-27" onChange={vi.fn()} />);

    expect(screen.getByRole("gridcell", { name: "Friday, August 28, 2026" })).toBeDisabled();
  });

  it("can clear an optional selected date", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<ThemedCalendar value="2026-08-25" onChange={vi.fn()} onClear={onClear} />);

    await user.click(screen.getByRole("button", { name: "Clear date" }));

    expect(onClear).toHaveBeenCalledOnce();
  });
});
