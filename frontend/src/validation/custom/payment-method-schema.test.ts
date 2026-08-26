import { describe, expect, it } from "vitest";
import { paymentMethodSchema } from "./payment-method-schema";

function fileList(file?: File): FileList {
  return {
    0: file as File,
    length: file ? 1 : 0,
    item: () => file ?? null,
    [Symbol.iterator]: function* () { if (file) yield file; },
  } as FileList;
}

const fields = {
  name: "GCash",
  account_name: "Dinks on Us",
  account_number: "09123456789",
};

describe("paymentMethodSchema", () => {
  it("requires a QR image when creating a payment method", () => {
    const result = paymentMethodSchema(true).safeParse({ ...fields, qr_image: fileList() });
    expect(result.success).toBe(false);
  });

  it("accepts JPG, PNG, and WebP images up to 5 MB", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      const file = new File([new Uint8Array(5 * 1024 * 1024)], "qr", { type });
      expect(paymentMethodSchema(true).safeParse({ ...fields, qr_image: fileList(file) }).success).toBe(true);
    }
  });

  it("rejects unsupported images and files larger than 5 MB", () => {
    const gif = new File(["gif"], "qr.gif", { type: "image/gif" });
    const largePng = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "qr.png", { type: "image/png" });

    expect(paymentMethodSchema(true).safeParse({ ...fields, qr_image: fileList(gif) }).success).toBe(false);
    expect(paymentMethodSchema(true).safeParse({ ...fields, qr_image: fileList(largePng) }).success).toBe(false);
  });

  it("allows an edit to keep the current QR image", () => {
    expect(paymentMethodSchema(false).safeParse({ ...fields, qr_image: fileList() }).success).toBe(true);
  });
});
