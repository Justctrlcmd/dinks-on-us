import { z } from "zod";

export const PAYMENT_QR_ACCEPT = "image/jpeg,image/png,image/webp";
export const PAYMENT_QR_MAX_BYTES = 5 * 1024 * 1024;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function paymentMethodSchema(requireQrImage: boolean) {
  return z.object({
    name: z.string().trim().min(1, "Enter the e-wallet or bank name.").max(100, "Keep the name under 100 characters."),
    account_name: z.string().trim().min(1, "Enter the account name.").max(150, "Keep the account name under 150 characters."),
    account_number: z.string().trim().min(1, "Enter the account number.").max(100, "Keep the account number under 100 characters."),
    qr_image: z.custom<FileList | undefined>((value) => value === undefined || (typeof value === "object" && value !== null), {
      message: "Select a QR image.",
    }),
  }).superRefine((values, context) => {
    const file = values.qr_image?.item(0) ?? undefined;

    if (!file && requireQrImage) {
      context.addIssue({ code: "custom", path: ["qr_image"], message: "Select a QR image." });
      return;
    }

    if (!file) return;
    if (!acceptedTypes.has(file.type)) {
      context.addIssue({ code: "custom", path: ["qr_image"], message: "Choose a JPG, PNG, or WebP image." });
    }
    if (file.size > PAYMENT_QR_MAX_BYTES) {
      context.addIssue({ code: "custom", path: ["qr_image"], message: "The QR image must not be larger than 5 MB." });
    }
  });
}

export type PaymentMethodValues = z.input<ReturnType<typeof paymentMethodSchema>>;
