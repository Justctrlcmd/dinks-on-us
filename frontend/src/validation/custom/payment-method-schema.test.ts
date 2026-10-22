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
  it.each(["abc", "123abc", "1e10", "+123", "123.45", "001 234", "123-456", "123\n", "１２３"])("rejects non-digit account number %j", (account_number) => {
    const result = paymentMethodSchema(false).safeParse({ ...fields, account_number });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe("Use numbers only for the account number.");
  });

  it("preserves leading zeros in account numbers", () => {
    const result = paymentMethodSchema(false).parse({ ...fields, account_number: "0011223344" });
    expect(result.account_number).toBe("0011223344");
  });
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
    expect(paymentMethodSchema(false).safeParse(fields).success).toBe(true);
    expect(paymentMethodSchema(true).safeParse(fields).success).toBe(false);
  });
});
