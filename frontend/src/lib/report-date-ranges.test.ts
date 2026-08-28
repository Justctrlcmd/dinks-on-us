import { describe, expect, it } from "vitest";
import { formatReportRange, resolveReportPreset } from "./report-date-ranges";

describe("report date ranges", () => {
  it("resolves the default rolling seven-day range inclusively", () => {
    expect(resolveReportPreset("LAST_7_DAYS", "2026-08-27")).toEqual({ from: "2026-08-21", to: "2026-08-27" });
  });

  it("uses no-overflow calendar subtraction for month presets", () => {
    expect(resolveReportPreset("LAST_3_MONTHS", "2026-05-31")).toEqual({ from: "2026-02-28", to: "2026-05-31" });
    expect(resolveReportPreset("LAST_12_MONTHS", "2024-02-29")).toEqual({ from: "2023-02-28", to: "2024-02-29" });
  });

  it("formats the resolved range for the filter summary", () => {
    expect(formatReportRange({ from: "2026-08-21", to: "2026-08-27" })).toBe("Aug 21 – Aug 27, 2026");
  });
});
