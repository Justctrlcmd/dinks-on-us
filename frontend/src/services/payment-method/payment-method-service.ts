import { authFetch, publicFetch } from "@/lib/api";
import type { PaymentMethod, PaymentMethodInput, PublicPaymentMethod } from "@/types/payment-method";

function paymentMethodFormData(input: PaymentMethodInput) {
  const data = new FormData();
  data.append("name", input.name);
  data.append("account_name", input.account_name);
  data.append("account_number", input.account_number);
  if (input.qr_image) data.append("qr_image", input.qr_image);
  return data;
}

export const getPaymentMethods = (signal?: AbortSignal) =>
  authFetch<PaymentMethod[]>("/api/v1/management/payment-methods", { signal });

export const getPublicPaymentMethods = (signal?: AbortSignal) =>
  publicFetch<PublicPaymentMethod[]>("/api/v1/public/payment-methods", { signal });

export const createPaymentMethod = (input: PaymentMethodInput) =>
  authFetch<PaymentMethod>("/api/v1/management/payment-methods", {
    method: "POST",
    csrf: true,
    body: paymentMethodFormData(input),
  });

export const updatePaymentMethod = ({ id, input }: { id: number; input: PaymentMethodInput }) => {
  const data = paymentMethodFormData(input);
  data.append("_method", "PATCH");

  return authFetch<PaymentMethod>(`/api/v1/management/payment-methods/${id}`, {
    method: "POST",
    csrf: true,
    body: data,
  });
};

export const deletePaymentMethod = (id: number) =>
  authFetch<null>(`/api/v1/management/payment-methods/${id}`, {
    method: "DELETE",
    csrf: true,
  });
