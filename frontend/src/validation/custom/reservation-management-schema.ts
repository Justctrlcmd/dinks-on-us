import { z } from "zod";

const acceptedReceiptTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const reservationConcernValues = [
  "INVALID_PAYMENT_PROOF",
  "UNVERIFIABLE_REFERENCE",
  "INCORRECT_AMOUNT",
  "DUPLICATE_OR_SUSPICIOUS_PAYMENT",
  "RESERVATION_INFORMATION_ISSUE",
  "OTHER",
] as const;

const paymentChannelSchema = z.enum(["CASH", "EWALLET", "BANK"], { error: "Choose a payment method." });
const addOnPaymentChannelSchema = z.enum(["CASH", "EWALLET_BANK"], { error: "Choose a payment method." });
const fileListSchema = z.custom<FileList | undefined>((value) => {
  if (value === undefined) return true;
  if (typeof value !== "object" || value === null) return false;
  return typeof (value as { item?: unknown }).item === "function";
}, {
  message: "Choose a valid receipt image.",
});
const slotSelectionSchema = z.object({
  courtId: z.string(),
  slot: z.string(),
});

export const rejectReservationSchema = z.object({
  concern: z.enum(reservationConcernValues, { error: "Choose a concern." }),
  reason: z.string().trim().min(1, "Enter a rejection reason.").max(1500, "Keep the reason under 1,500 characters."),
});

export function rescheduleReservationSchema(requiredCount: number) {
  return z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a reservation date."),
    ranges: z.array(slotSelectionSchema).length(requiredCount, "Select every required replacement slot."),
  }).superRefine((values, context) => {
    values.ranges.forEach((range, index) => {
      if (!range.courtId) context.addIssue({ code: "custom", path: ["ranges", index, "courtId"], message: "Choose a court." });
      if (!range.slot) context.addIssue({ code: "custom", path: ["ranges", index, "slot"], message: "Choose a time slot." });
    });

    const completeRanges = values.ranges.filter((range) => range.courtId && range.slot);
    const keys = completeRanges.map((range) => `${range.courtId}-${range.slot}`);
    if (new Set(keys).size !== keys.length) {
      context.addIssue({ code: "custom", path: ["ranges"], message: "Replacement slots cannot contain duplicates." });
    }
  });
}

const addOnsBaseSchema = z.object({
  ranges: z.array(slotSelectionSchema).min(1),
  additional_players: z.number().int().min(0).max(1000),
  equipment: z.record(z.string(), z.number().int().min(0).max(1000)),
  payment_channel: addOnPaymentChannelSchema.nullable(),
  payment_method_id: z.number().int().positive().optional(),
  payment_reference_number: z.string().trim().max(180, "Keep the transaction reference under 180 characters.").optional(),
  payment_proof: fileListSchema.optional(),
});

export const reservationAddOnsSchema = addOnsBaseSchema.superRefine((values, context) => {
  values.ranges.forEach((range, index) => {
    if (!range.courtId && !range.slot) return;
    if (!range.courtId) context.addIssue({ code: "custom", path: ["ranges", index, "courtId"], message: "Choose a court." });
    if (!range.slot) context.addIssue({ code: "custom", path: ["ranges", index, "slot"], message: "Choose a time slot." });
  });
  const hasCompleteRange = values.ranges.some((range) => range.courtId && range.slot);
  const hasEquipment = Object.values(values.equipment).some((quantity) => quantity > 0);
  if (!hasCompleteRange && values.additional_players === 0 && !hasEquipment) {
    context.addIssue({ code: "custom", path: ["ranges"], message: "Add at least one court time, player, or equipment item." });
  }
  if (!values.payment_channel) {
    context.addIssue({ code: "custom", path: ["payment_channel"], message: "Choose a payment method." });
  }

  if (values.payment_channel === "EWALLET_BANK") {
    if (!values.payment_method_id) {
      context.addIssue({ code: "custom", path: ["payment_method_id"], message: "Choose an active e-wallet or bank payment method." });
    }
    if (!values.payment_reference_number?.trim()) {
      context.addIssue({ code: "custom", path: ["payment_reference_number"], message: "Enter the transaction reference for this payment method." });
    }
    if (!(values.payment_proof?.item(0))) {
      context.addIssue({ code: "custom", path: ["payment_proof"], message: "Select a receipt image for this payment method." });
    }
  }

  validateReceipt(values.payment_proof, context);
});

const completeReservationBaseSchema = z.object({
  payment_channel: paymentChannelSchema.nullable(),
  payment_reference_number: z.string().trim().max(180, "Keep the transaction reference under 180 characters.").optional(),
  payment_proof: fileListSchema,
});

export function completeReservationSchema(requiresPayment: boolean) {
  return completeReservationBaseSchema.superRefine((values, context) => {
    if (requiresPayment && !values.payment_channel) {
      context.addIssue({ code: "custom", path: ["payment_channel"], message: "Choose how the outstanding amount was collected." });
    }
    validateReceipt(values.payment_proof, context);
  });
}

export const cancelReservationSchema = z.object({
  reason: z.string().trim().min(1, "Enter a cancellation reason.").max(1500, "Keep the reason under 1,500 characters."),
  refund_type: z.enum(["FULL", "CUSTOM"]),
  refund_amount: z.preprocess((value) => value === "" || value === null || value === undefined ? undefined : Number(value), z.number().finite().min(0, "Refund cannot be negative.").optional()),
}).superRefine((values, context) => {
  if (values.refund_type === "CUSTOM" && values.refund_amount === undefined) {
    context.addIssue({ code: "custom", path: ["refund_amount"], message: "Enter the custom refund amount." });
  }
});

export const availabilityReopenSchema = z.object({
  reason: z.string().trim().min(1, "Enter a reopening description.").max(1000, "Keep the description under 1,000 characters."),
});

export type RejectReservationValues = z.infer<typeof rejectReservationSchema>;
export type RescheduleReservationValues = z.input<ReturnType<typeof rescheduleReservationSchema>>;
export type ReservationAddOnsValues = z.infer<typeof reservationAddOnsSchema>;
export type CompleteReservationValues = z.input<ReturnType<typeof completeReservationSchema>>;
export type CancelReservationValues = z.input<typeof cancelReservationSchema>;
export type AvailabilityReopenValues = z.infer<typeof availabilityReopenSchema>;

function validateReceipt(value: FileList | undefined, context: z.RefinementCtx): void {
  const file = value?.item(0) ?? undefined;
  if (!file) return;
  if (!acceptedReceiptTypes.has(file.type)) {
    context.addIssue({ code: "custom", path: ["payment_proof"], message: "Choose a JPG, PNG, or WebP receipt image." });
  }
  if (file.size > 5 * 1024 * 1024) {
    context.addIssue({ code: "custom", path: ["payment_proof"], message: "The receipt must not be larger than 5 MB." });
  }
}
