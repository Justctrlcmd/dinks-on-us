import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReportFilterBar } from "./report-filter-bar";

afterEach(cleanup);

const baseProps = {
  draftRange: { from: "2026-08-21", to: "2026-08-27" },
  today: "2026-08-27",
  courtId: null,
  source: null,
  courts: [{ id: 1, name: "Court 1", is_active: true }],
  customError: null,
  onPresetChange: vi.fn(),
  onDraftRangeChange: vi.fn(),
  onApplyCustom: vi.fn(),
  onCourtChange: vi.fn(),
  onSourceChange: vi.fn(),
};

describe("ReportFilterBar", () => {
  it("does not repeat the resolved range above the filters", () => {
    render(<ReportFilterBar {...baseProps} preset="LAST_7_DAYS" />);
    expect(screen.queryByText("Aug 21 – Aug 27, 2026")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Date Range")).toBeInTheDocument();
    expect(screen.getByLabelText("Court")).toBeInTheDocument();
    expect(screen.getByLabelText("Source")).toBeInTheDocument();
  });

  it("uses the shared date pickers and prevents an invalid custom range from applying", () => {
    render(<ReportFilterBar {...baseProps} preset="CUSTOM" customError="The end date must be on or after the start date." />);
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("To")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("The end date must be on or after the start date.");
  });
});
