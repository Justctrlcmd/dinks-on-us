import { z } from "zod";

const ratePeriodSchema = z.object({
  start_hour: z.number().int(),
  end_hour: z.number().int(),
  price: z.number().min(0, "Enter a price of zero or more."),
});

export const courtConfigurationSchema = z.object({
  opening_hour: z.number().int().min(0).max(23),
  closing_hour: z.number().int().min(1).max(24),
  included_players_per_court: z.number().int().min(1, "At least one player must be included.").max(100),
  additional_player_price: z.number().min(0, "Enter a price of zero or more."),
  weekday_rates: z.array(ratePeriodSchema).min(1),
  weekend_rates: z.array(ratePeriodSchema).min(1),
}).superRefine((values, context) => {
  if (values.closing_hour <= values.opening_hour) {
    context.addIssue({ code: "custom", path: ["closing_hour"], message: "Closing time must be later than opening time." });
  }

  for (const field of ["weekday_rates", "weekend_rates"] as const) {
    let expectedStart = values.opening_hour;
    values[field].forEach((period, index) => {
      if (period.start_hour !== expectedStart) {
        context.addIssue({ code: "custom", path: [field, index, "start_hour"], message: "Continue from the previous ending time." });
      }
      if (period.end_hour <= period.start_hour || period.end_hour > values.closing_hour) {
        context.addIssue({ code: "custom", path: [field, index, "end_hour"], message: "Choose a later time no later than closing." });
      }
      expectedStart = period.end_hour;
    });
    if (expectedStart !== values.closing_hour) {
      context.addIssue({ code: "custom", path: [field], message: "Rates must cover every hour through closing." });
    }
  }
});

export const rentalEquipmentSchema = z.object({
  name: z.string().trim().min(1, "Enter the equipment name.").max(120),
  price: z.number().min(0, "Enter a price of zero or more."),
  total_quantity: z.number().int().min(1, "Quantity must be at least one.").max(100000),
});

export type CourtConfigurationValues = z.infer<typeof courtConfigurationSchema>;
export type RentalEquipmentValues = z.infer<typeof rentalEquipmentSchema>;
