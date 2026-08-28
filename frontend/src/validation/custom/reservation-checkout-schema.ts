import { z } from "zod";
import { philippineMobileNumberSchema } from "./contact-number-schema";

export const RESERVATION_RECEIPT_ACCEPT = "image/jpeg,image/png,image/webp";
export const RESERVATION_RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
const acceptedReceiptTypes = new Set(RESERVATION_RECEIPT_ACCEPT.split(","));

function isFileList(value: unknown): value is FileList {
  return typeof value === "object" && value !== null && "item" in value && typeof value.item === "function";
}

export const reservationCheckoutSchema = z.object({
  customer_name: z.string().trim().min(1, "Enter your full name.").max(180, "Keep your name under 180 characters."),
  customer_email: z.email("Enter a valid email address.").trim().max(180, "Keep your email under 180 characters."),
  customer_contact_number: philippineMobileNumberSchema("Enter your mobile number."),
  payment_method_id: z.string().trim().min(1, "Choose a payment method."),
  payment_reference_number: z.string().trim().min(1, "Enter the transaction reference number.").max(180, "Keep the transaction reference under 180 characters."),
  payment_proof: z.custom<FileList | undefined>((value) => value === undefined || isFileList(value), {
    message: "Select a payment proof image.",
  }),
  policy_acknowledged: z.boolean().refine((value) => value, "Accept the reservation policies before submitting."),
}).superRefine((values, context) => {
  if (values.payment_proof === undefined) {
    context.addIssue({ code: "custom", path: ["payment_proof"], message: "Select a payment proof image." });
    return;
  }
  if (!isFileList(values.payment_proof)) return;

  const file = values.payment_proof.item(0) ?? undefined;
  if (!file) {
    context.addIssue({ code: "custom", path: ["payment_proof"], message: "Select a payment proof image." });
    return;
  }

  if (!acceptedReceiptTypes.has(file.type)) {
    context.addIssue({ code: "custom", path: ["payment_proof"], message: "The payment proof must be a JPG, PNG, or WebP image." });
  }
  if (file.size > RESERVATION_RECEIPT_MAX_BYTES) {
    context.addIssue({ code: "custom", path: ["payment_proof"], message: "The payment proof must not be larger than 5 MB." });
  }
});

export type ReservationCheckoutValues = z.input<typeof reservationCheckoutSchema>;
