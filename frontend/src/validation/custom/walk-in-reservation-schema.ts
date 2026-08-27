import { z } from "zod";

export const WALK_IN_RECEIPT_ACCEPT = "image/jpeg,image/png,image/webp";
export const WALK_IN_RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
const acceptedReceiptTypes = new Set(WALK_IN_RECEIPT_ACCEPT.split(","));

export const walkInReservationSchema = z.object({
  customer_name: z.string().trim().min(1, "Enter the customer's name.").max(180, "Keep the name under 180 characters."),
  customer_email: z.email("Enter a valid email address.").trim().max(180, "Keep the email under 180 characters."),
  customer_contact_number: z.string().trim().min(1, "Enter the customer's contact number.").max(30, "Keep the contact number under 30 characters."),
  date: z.string().min(1, "Choose a reservation date."),
  slots: z.array(z.object({
    court_id: z.number().int().positive(),
    date: z.string().min(1),
    start_hour: z.number().int().min(0).max(23),
  })).min(1, "Choose at least one complete court and time slot."),
  equipment: z.array(z.object({ id: z.number().int().positive(), quantity: z.number().int().positive() })),
  additional_players: z.number().int().min(0).max(1000),
  payment_channel: z.enum(["CASH", "EWALLET_BANK"], { error: "Choose a payment method." }),
  payment_reference_number: z.string().trim().max(180, "Keep the transaction reference under 180 characters.").optional(),
  payment_proof: z.custom<FileList | undefined>((value) => value === undefined || (typeof value === "object" && value !== null), {
    message: "Choose a valid receipt image.",
  }),
}).superRefine((values, context) => {
  const keys = values.slots.map((slot) => `${slot.court_id}-${slot.date}-${slot.start_hour}`);
  if (new Set(keys).size !== keys.length) {
    context.addIssue({ code: "custom", path: ["slots"], message: "The same court time cannot be selected more than once." });
  }

  const file = values.payment_proof?.item(0) ?? undefined;
  if (!file) return;
  if (!acceptedReceiptTypes.has(file.type)) {
    context.addIssue({ code: "custom", path: ["payment_proof"], message: "Choose a JPG, PNG, or WebP receipt image." });
  }
  if (file.size > WALK_IN_RECEIPT_MAX_BYTES) {
    context.addIssue({ code: "custom", path: ["payment_proof"], message: "The receipt must not be larger than 5 MB." });
  }
});

export type WalkInReservationValues = z.input<typeof walkInReservationSchema>;
