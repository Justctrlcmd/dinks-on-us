import type { PaginationMeta } from "@/types/api";

export type PaymentProofCleanupRange = {
  from: string;
  to: string;
};

export type DeletePaymentProofCleanupInput = PaymentProofCleanupRange & {
  current_password: string;
};

export type PaymentProofCleanupPreview = PaymentProofCleanupRange & {
  reservations_affected: number;
  proof_count: number;
  reclaimable_bytes: number;
  status_counts: Partial<Record<"COMPLETED" | "CANCELLED" | "REJECTED" | "NO_SHOW", number>>;
};

export type PaymentProofCleanupResult = PaymentProofCleanupRange & {
  reservations_affected: number;
  proofs_deleted: number;
  missing_files: number;
  failed_files: number;
  reclaimed_bytes: number;
  result: "COMPLETED" | "PARTIAL";
};

export type PaymentProofCleanupActivity = {
  id: number;
  action: "PAYMENT_PROOFS_DELETED";
  actor_name: string;
  details: Omit<PaymentProofCleanupResult, "missing_files" | "failed_files"> & {
    missing_files?: number;
    failed_files?: number;
  };
  created_at: string;
};

export type PaginatedPaymentProofCleanupActivity = {
  data: PaymentProofCleanupActivity[];
  meta: PaginationMeta;
};
