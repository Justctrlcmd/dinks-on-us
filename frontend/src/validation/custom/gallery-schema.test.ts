import { describe, expect, it } from "vitest";
import { galleryImageSchema, galleryTabSchema } from "./gallery-schema";

describe("gallery schemas", () => {
  it("normalizes category names and rejects empty names", () => {
    expect(galleryTabSchema.parse({ name: "  Interior  " })).toEqual({ name: "Interior" });
    expect(galleryTabSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("requires accessible image details and a file during creation", () => {
    expect(galleryImageSchema(true).safeParse({ gallery_tab_id: 1, alt_text: "Court-side view", image: undefined }).success).toBe(false);
    expect(galleryImageSchema(false).safeParse({ gallery_tab_id: 1, alt_text: "Court-side view", image: undefined }).success).toBe(true);
    expect(galleryImageSchema(false).safeParse({ gallery_tab_id: 0, alt_text: "", image: undefined }).success).toBe(false);
  });
});
