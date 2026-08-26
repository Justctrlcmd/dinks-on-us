import { describe, expect, it } from "vitest";
import { EVENT_IMAGE_MAX_BYTES, eventSchema } from "./event-schema";

function files(file: File): FileList {
  return {
    0: file,
    length: 1,
    item: (index: number) => index === 0 ? file : null,
  } as unknown as FileList;
}

const validFields = {
  header: "Grand Opening",
  description: "Join us for opening day.",
  event_date: "2026-09-12",
};

describe("eventSchema", () => {
  it("requires all four fields when creating an event", () => {
    const result = eventSchema(true).safeParse({ header: "", description: "", event_date: "", image: undefined });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toMatchObject({
        header: ["Enter the event header."],
        description: ["Enter the event description."],
        event_date: ["Choose an event date."],
        image: ["Select an event image."],
      });
    }
  });

  it("accepts the supported image types", () => {
    const image = new File(["image"], "event.webp", { type: "image/webp" });
    expect(eventSchema(true).safeParse({ ...validFields, image: files(image) }).success).toBe(true);
  });

  it("rejects unsupported and oversized images", () => {
    const unsupported = new File(["image"], "event.gif", { type: "image/gif" });
    const oversized = new File([new Uint8Array(EVENT_IMAGE_MAX_BYTES + 1)], "event.jpg", { type: "image/jpeg" });

    expect(eventSchema(true).safeParse({ ...validFields, image: files(unsupported) }).success).toBe(false);
    expect(eventSchema(true).safeParse({ ...validFields, image: files(oversized) }).success).toBe(false);
  });

  it("allows the existing image to remain unchanged while editing", () => {
    expect(eventSchema(false).safeParse({ ...validFields, image: undefined }).success).toBe(true);
  });
});
