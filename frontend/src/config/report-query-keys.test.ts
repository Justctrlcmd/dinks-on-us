import { describe, expect, it } from "vitest";
import { reportKeys } from "./query-keys";

describe("report query keys", () => {
  it("include normalized range, court, source, and grouping inputs", () => {
    const base = { from: "2026-08-21", to: "2026-08-27", court_id: null, source: null } as const;
    const filtered = { ...base, court_id: 2, source: "ONLINE" as const };

    expect(reportKeys.overview(base)).not.toEqual(reportKeys.overview(filtered));
    expect(reportKeys.revenue(filtered, "day")).not.toEqual(reportKeys.revenue(filtered, "month"));
    expect(reportKeys.revenue(filtered, "day")).toEqual(["reports", "revenue", filtered, "day"]);
  });
});
