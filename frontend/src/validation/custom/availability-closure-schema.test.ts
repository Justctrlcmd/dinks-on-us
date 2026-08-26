import { describe, expect, it } from "vitest";
import { availabilityClosureSchema } from "@/validation/custom/court-pricing-schema";

describe("availabilityClosureSchema", () => {
  it("requires an internal reason for every closure", () => {
    const result = availabilityClosureSchema.safeParse({
      type: "entire_operation",
      date: "2026-09-01",
      periods: [{ start_hour: 7, end_hour: 8 }],
      reason: " ",
    });

    expect(result.success).toBe(false);
  });

  it("rejects overlapping grouped court-time ranges", () => {
    const result = availabilityClosureSchema.safeParse({
      type: "court_time",
      date: "2026-09-01",
      court_id: 1,
      periods: [
        { start_hour: 9, end_hour: 11 },
        { start_hour: 10, end_hour: 12 },
      ],
      reason: "Maintenance",
    });

    expect(result.success).toBe(false);
  });
});
