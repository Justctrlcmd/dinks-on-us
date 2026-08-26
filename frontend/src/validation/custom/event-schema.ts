import { z } from "zod";

export const EVENT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const EVENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function eventSchema(requireImage: boolean) {
  return z.object({
    header: z.string().trim().min(1, "Enter the event header.").max(200, "Keep the header under 200 characters."),
    description: z.string().trim().min(1, "Enter the event description.").max(10_000, "Keep the description under 10,000 characters."),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an event date."),
    image: z.custom<FileList | undefined>((value) => value === undefined || (typeof value === "object" && value !== null), {
      message: "Select an event image.",
    }),
  }).superRefine((values, context) => {
    const file = values.image?.item(0) ?? undefined;

    if (!file && requireImage) {
      context.addIssue({ code: "custom", path: ["image"], message: "Select an event image." });
      return;
    }

    if (!file) return;
    if (!acceptedTypes.has(file.type)) {
      context.addIssue({ code: "custom", path: ["image"], message: "Choose a JPG, PNG, or WebP image." });
    }
    if (file.size > EVENT_IMAGE_MAX_BYTES) {
      context.addIssue({ code: "custom", path: ["image"], message: "The event image must not be larger than 5 MB." });
    }
  });
}

export type EventValues = z.input<ReturnType<typeof eventSchema>>;
