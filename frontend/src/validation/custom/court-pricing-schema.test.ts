import { describe, expect, it } from "vitest";
import { courtConfigurationSchema } from "./court-pricing-schema";

const configuration = {
  opening_hour: 7, closing_hour: 24, included_players_per_court: 4,
  additional_player_price: 100, advance_booking_days: 30,
  weekday_rates: [{ start_hour: 7, end_hour: 24, price: 500 }],
  weekend_rates: [{ start_hour: 7, end_hour: 24, price: 600 }],
};

describe("court pricing validation", () => {
  it("asks staff to add weekday and weekend price periods instead of showing technical errors", () => {
    const result = courtConfigurationSchema.safeParse({ ...configuration, weekday_rates: [], weekend_rates: [] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map(({ message }) => message)).toEqual([
      "Add at least one weekday price period.", "Add at least one weekend price period.",
    ]);
  });

  it("accepts complete rates and rejects gaps and incomplete coverage", () => {
    expect(courtConfigurationSchema.safeParse(configuration).success).toBe(true);
    expect(courtConfigurationSchema.safeParse({ ...configuration, weekday_rates: [{ start_hour: 8, end_hour: 24, price: 500 }] }).success).toBe(false);
    expect(courtConfigurationSchema.safeParse({ ...configuration, weekend_rates: [{ start_hour: 7, end_hour: 23, price: 600 }] }).success).toBe(false);
  });
});
