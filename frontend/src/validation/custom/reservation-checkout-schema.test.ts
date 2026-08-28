import { describe, expect, it } from "vitest";
import { reservationCheckoutSchema } from "./reservation-checkout-schema";

function fileList(file?: File): FileList {
  return {
    0: file as File,
    length: file ? 1 : 0,
    item: () => file ?? null,
    [Symbol.iterator]: function* () { if (file) yield file; },
  } as FileList;
}

const validFields = {
  customer_name: "Maria Santos",
  customer_email: "maria@example.com",
  customer_contact_number: "09123456789",
  payment_method_id: "1",
  payment_reference_number: "TX-12345",
  policy_acknowledged: true,
};

describe("reservationCheckoutSchema", () => {
  it("reports errors for missing checkout fields", () => {
    const result = reservationCheckoutSchema.safeParse({
      customer_name: "",
      customer_email: "",
      customer_contact_number: "",
      payment_method_id: "",
      payment_reference_number: "",
      payment_proof: fileList(),
      policy_acknowledged: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toMatchObject({
        customer_name: ["Enter your full name."],
        customer_email: ["Enter a valid email address."],
        customer_contact_number: ["Enter your mobile number."],
        payment_method_id: ["Choose a payment method."],
        payment_reference_number: ["Enter the transaction reference number."],
        payment_proof: ["Select a payment proof image."],
        policy_acknowledged: ["Accept the reservation policies before submitting."],
      });
    }
  });

  it("requires an 11-digit mobile number starting with 09", () => {
    for (const customer_contact_number of ["0912345678", "091234567890", "09A23456789", "+639123456789"]) {
      expect(reservationCheckoutSchema.safeParse({ ...validFields, customer_contact_number, payment_proof: fileList(new File(["receipt"], "receipt.png", { type: "image/png" })) }).success).toBe(false);
    }
  });

  it("accepts a supported receipt image up to 5 MB", () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024)], "receipt.png", { type: "image/png" });
    expect(reservationCheckoutSchema.safeParse({ ...validFields, payment_proof: fileList(file) }).success).toBe(true);
  });

  it("rejects unsupported and oversized receipts", () => {
    const unsupported = new File(["gif"], "receipt.gif", { type: "image/gif" });
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "receipt.png", { type: "image/png" });

    expect(reservationCheckoutSchema.safeParse({ ...validFields, payment_proof: fileList(unsupported) }).success).toBe(false);
    expect(reservationCheckoutSchema.safeParse({ ...validFields, payment_proof: fileList(oversized) }).success).toBe(false);
  });
});
