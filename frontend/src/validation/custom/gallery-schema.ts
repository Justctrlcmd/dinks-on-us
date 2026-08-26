import { z } from "zod";

export const GALLERY_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const GALLERY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export const galleryTabSchema = z.object({
  name: z.string().trim().min(1, "Enter the category name.").max(100, "Keep the category name under 100 characters."),
});

export function galleryImageSchema(requireImage: boolean) {
  return z.object({
    gallery_tab_id: z.number().int().positive("Choose a gallery category."),
    alt_text: z.string().trim().min(1, "Describe what appears in the image.").max(500, "Keep the alt text under 500 characters."),
    image: z.custom<FileList | undefined>((value) => value === undefined || (typeof value === "object" && value !== null), {
      message: "Select a gallery image.",
    }),
  }).superRefine((values, context) => {
    const file = values.image?.item(0) ?? undefined;

    if (!file && requireImage) {
      context.addIssue({ code: "custom", path: ["image"], message: "Select a gallery image." });
      return;
    }

    if (!file) return;
    if (!acceptedTypes.has(file.type)) {
      context.addIssue({ code: "custom", path: ["image"], message: "Choose a JPG, PNG, or WebP image." });
    }
    if (file.size > GALLERY_IMAGE_MAX_BYTES) {
      context.addIssue({ code: "custom", path: ["image"], message: "The gallery image must not be larger than 5 MB." });
    }
  });
}

export type GalleryTabValues = z.input<typeof galleryTabSchema>;
export type GalleryImageValues = z.input<ReturnType<typeof galleryImageSchema>>;
