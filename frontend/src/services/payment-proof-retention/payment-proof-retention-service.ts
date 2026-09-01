import { authFetch } from "@/lib/api";
import type {
  PaginatedPaymentProofCleanupActivity,
  PaymentProofCleanupActivity,
  PaymentProofCleanupPreview,
  PaymentProofCleanupRange,
  PaymentProofCleanupResult,
} from "@/types/payment-proof-retention";

function rangeParams(range: PaymentProofCleanupRange): string {
  const params = new URLSearchParams({ from: range.from, to: range.to });
  return params.toString();
}

export async function getPaymentProofCleanupPreview(range: PaymentProofCleanupRange, signal?: AbortSignal): Promise<PaymentProofCleanupPreview> {
  const response = await authFetch<PaymentProofCleanupPreview>(`/api/v1/management/payment-proof-retention/preview?${rangeParams(range)}`, { signal });
  return response.data;
}

export const deletePaymentProofs = (input: PaymentProofCleanupRange) =>
  authFetch<PaymentProofCleanupResult>("/api/v1/management/payment-proof-retention/delete", {
    method: "POST",
    csrf: true,
    body: JSON.stringify({ ...input, confirm: true }),
  });

export async function getPaymentProofCleanupActivity(page: number, signal?: AbortSignal): Promise<PaginatedPaymentProofCleanupActivity> {
  const response = await authFetch<PaymentProofCleanupActivity[]>(`/api/v1/management/payment-proof-retention/activity?page=${page}`, { signal });
  return { data: response.data, meta: response.meta! };
}
