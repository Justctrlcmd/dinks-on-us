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

const closurePeriodSchema = z.object({
  start_hour: z.number().int(),
  end_hour: z.number().int(),
});

export const availabilityClosureSchema = z.object({
  type: z.enum(["entire_operation", "court_time"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a closure date."),
  court_id: z.number().int().positive().optional(),
  periods: z.array(closurePeriodSchema).min(1),
  reason: z.string().trim().min(1, "Enter an internal reason.").max(1000),
}).superRefine((values, context) => {
  if (values.type === "court_time" && !values.court_id) {
    context.addIssue({ code: "custom", path: ["court_id"], message: "Choose a court." });
  }

  if (values.type !== "court_time") return;

  const periods = values.periods
    .map((period, index) => ({ ...period, index }))
    .sort((left, right) => left.start_hour - right.start_hour);
  let previousEnd: number | undefined;

  periods.forEach((period) => {
    if (period.end_hour <= period.start_hour) {
      context.addIssue({ code: "custom", path: ["periods", period.index, "end_hour"], message: "Choose a later ending time." });
    }
    if (previousEnd !== undefined && period.start_hour < previousEnd) {
      context.addIssue({ code: "custom", path: ["periods", period.index, "start_hour"], message: "Time ranges cannot overlap." });
    }
    previousEnd = Math.max(previousEnd ?? period.end_hour, period.end_hour);
  });
});

export type AvailabilityClosureValues = z.infer<typeof availabilityClosureSchema>;
