"use client";

import { useState } from "react";
import { FiActivity, FiAlertTriangle, FiCheckCircle, FiDatabase, FiTrash2 } from "react-icons/fi";
import { CalendarDatePicker } from "@/components/common/calendar-date-picker";
import { CurrentPasswordConfirmationDialog } from "@/components/common/current-password-confirmation-dialog";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDeletePaymentProofs } from "@/hooks/mutations/use-payment-proof-retention-mutations";
import { usePaymentProofCleanupActivity, usePaymentProofCleanupPreview } from "@/hooks/queries/use-payment-proof-retention";
import { formatDateOnly, formatDateTime, todayInTimeZone } from "@/lib/date";
import { isMutationRateLimited, mutationButtonLabel } from "@/lib/mutation-rate-limit";
import type { PaymentProofCleanupActivity, PaymentProofCleanupPreview, PaymentProofCleanupRange } from "@/types/payment-proof-retention";

const statusLabels: Record<string, string> = {
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
  NO_SHOW: "No-show",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function formatRange(range: PaymentProofCleanupRange): string {
  return `${formatDateOnly(range.from)} – ${formatDateOnly(range.to)}`;
}

function SummaryItem({ label, value, icon: Icon }: { label: string; value: string; icon: typeof FiDatabase }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-background p-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon aria-hidden="true" className="size-3.5" /></span>
      <div className="min-w-0">
        <p className="text-[0.68rem] font-bold uppercase tracking-[.1em] text-muted-foreground">{label}</p>
        <p className="truncate font-heading text-base font-bold">{value}</p>
      </div>
    </div>
  );
}

function PreviewSummary({ range, preview }: { range: PaymentProofCleanupRange; preview: PaymentProofCleanupPreview }) {
  const statuses = Object.entries(preview.status_counts).filter(([, count]) => Boolean(count));

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <SummaryItem label="Proof images" value={String(preview.proof_count)} icon={FiDatabase} />
        <SummaryItem label="Reservations" value={String(preview.reservations_affected)} icon={FiCheckCircle} />
        <SummaryItem label="Estimated storage" value={formatBytes(preview.reclaimable_bytes)} icon={FiTrash2} />
      </div>
      <p className="text-sm text-muted-foreground">Booking dates <span className="font-medium text-foreground">{formatRange(range)}</span>. Only finalized reservations are included.</p>
      {statuses.length > 0 ? <p className="text-xs text-muted-foreground">{statuses.map(([status, count]) => `${count} ${statusLabels[status] ?? status}`).join(" · ")}</p> : null}
    </div>
  );
}

function ActivityCard({ activity }: { activity: PaymentProofCleanupActivity }) {
  const details = activity.details;
  const partial = details.result === "PARTIAL";
  const headline = details.proofs_deleted > 0
    ? `${details.proofs_deleted} payment proof image${details.proofs_deleted === 1 ? "" : "s"} deleted`
    : `${details.missing_files ?? 0} stale payment proof reference${details.missing_files === 1 ? "" : "s"} resolved`;

  return (
    <article className="flex min-h-16 gap-2.5 rounded-lg border border-border bg-background p-2.5">
      <span className={partial ? "grid size-8 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300" : "grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"}>
        {partial ? <FiAlertTriangle aria-hidden="true" className="size-3.5" /> : <FiTrash2 aria-hidden="true" className="size-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-heading text-sm font-bold leading-5">{headline}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Booking dates {formatDateOnly(details.from)} – {formatDateOnly(details.to)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="whitespace-nowrap">{formatBytes(details.reclaimed_bytes)} reclaimed</span>
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <FiCheckCircle aria-hidden="true" className="size-3 text-emerald-600" />
            <span className="font-medium text-emerald-700 dark:text-emerald-300">Successful</span>
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Deleted {formatDateTime(activity.created_at)} by {activity.actor_name}</p>
      </div>
    </article>
  );
}

export function PaymentProofRetentionManagementView() {
  const today = todayInTimeZone();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [previewRange, setPreviewRange] = useState<PaymentProofCleanupRange | null>(null);
  const [activityPage, setActivityPage] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [passwordConfirmationOpen, setPasswordConfirmationOpen] = useState(false);
  const previewQuery = usePaymentProofCleanupPreview(previewRange);
  const activityQuery = usePaymentProofCleanupActivity(activityPage);
  const deleteMutation = useDeletePaymentProofs();
  const validRange = Boolean(from && to && from <= to);
  const previewMatchesDraft = previewRange?.from === from && previewRange?.to === to;
  const preview = previewRange && previewMatchesDraft ? previewQuery.data : undefined;
  const canDelete = Boolean(preview && preview.proof_count > 0 && previewRange);

  function changeFrom(value: string) {
    setFrom(value);
    setPreviewRange(null);
  }

  function changeTo(value: string) {
    setTo(value);
    setPreviewRange(null);
  }

  function previewCleanup() {
    if (!validRange) return;
    setPreviewRange({ from, to });
  }

  async function deleteProofs(currentPassword: string) {
    if (!previewRange) return;

    await deleteMutation.mutateAsync({ ...previewRange, current_password: currentPassword });
    setPasswordConfirmationOpen(false);
    setConfirmOpen(false);
    setPreviewRange(null);
    setActivityPage(1);
  }

  return (
    <div className="grid gap-4">
      <PageHeader title="Storage & Data Retention" description="Manually remove finalized payment-proof images while preserving reservation and payment records." />

      <Card size="sm">
        <CardHeader>
          <CardTitle>Payment proof cleanup</CardTitle>
          <CardDescription>Choose reservation booking dates, preview the scope, then confirm the image-only deletion.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="payment-proof-cleanup-from" className="text-sm font-medium">From booking date</label>
              <CalendarDatePicker id="payment-proof-cleanup-from" value={from} max={today} onChange={changeFrom} placeholder="Select start date" />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="payment-proof-cleanup-to" className="text-sm font-medium">To booking date</label>
              <CalendarDatePicker id="payment-proof-cleanup-to" value={to} min={from || undefined} max={today} onChange={changeTo} placeholder="Select end date" />
            </div>
          </div>
          {from && to && from > to ? <p className="text-sm text-destructive">The end date must be on or after the start date.</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={previewCleanup} disabled={!validRange || previewQuery.isFetching}><FiDatabase aria-hidden="true" />{previewQuery.isFetching ? "Previewing…" : "Preview cleanup"}</Button>
            {previewRange && !previewMatchesDraft ? <p className="text-xs text-muted-foreground">Update the preview before deleting.</p> : null}
          </div>

          {previewRange && previewQuery.isPending ? <LoadingState message="Calculating payment proof storage…" /> : null}
          {previewRange && previewQuery.isError ? <ErrorState title="The cleanup preview could not be loaded." description="Try previewing this booking-date range again." onRetry={() => void previewQuery.refetch()} /> : null}
          {preview && previewRange ? (
            preview.proof_count === 0 ? <EmptyState title="No payment proofs match this range." description="No finalized reservation proof images are available for the selected booking dates." /> : (
              <div className="grid gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <PreviewSummary range={previewRange} preview={preview} />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-primary/15 pt-3">
                  <p className="text-xs text-muted-foreground">Deletion is manual and cannot be undone from the portal.</p>
                  <Button type="button" variant="destructive" disabled={!canDelete || deleteMutation.isPending || isMutationRateLimited(deleteMutation)} onClick={() => { setPasswordConfirmationOpen(false); setConfirmOpen(true); }}><FiTrash2 aria-hidden="true" />{mutationButtonLabel("Deleting…", "Delete payment proof images", deleteMutation)}</Button>
                </div>
              </div>
            )
          ) : null}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader><CardTitle className="flex items-center gap-2"><FiActivity aria-hidden="true" className="size-4 text-primary" />Activity Log</CardTitle><CardDescription>Recent manual cleanup summaries. Customer and payment details are not shown.</CardDescription></CardHeader>
        <CardContent className="grid gap-2">
          {activityQuery.isPending ? <LoadingState message="Loading payment proof cleanup activity…" /> : activityQuery.isError ? <ErrorState title="The cleanup activity could not be loaded." onRetry={() => void activityQuery.refetch()} /> : activityQuery.data.data.length === 0 ? <EmptyState title="No cleanup activity yet." description="Confirmed payment proof image deletions will appear here." /> : <>{activityQuery.data.data.map((activity) => <ActivityCard key={activity.id} activity={activity} />)}{activityQuery.data.meta.last_page > 1 ? <Pagination page={activityPage} lastPage={activityQuery.data.meta.last_page} onChange={setActivityPage} /> : null}</>}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen && !passwordConfirmationOpen} onOpenChange={(open) => { if (!deleteMutation.isPending && !passwordConfirmationOpen) setConfirmOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete payment proof images?</DialogTitle>
            <DialogDescription>This permanently removes {preview?.proof_count ?? 0} payment proof image{preview?.proof_count === 1 ? "" : "s"} for booking dates {previewRange ? formatRange(previewRange) : "this range"}. Reservation and payment records will remain unchanged, but these images cannot be viewed after deletion.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={deleteMutation.isPending} />}>Keep images</DialogClose>
            <Button type="button" variant="destructive" disabled={deleteMutation.isPending || isMutationRateLimited(deleteMutation)} onClick={() => setPasswordConfirmationOpen(true)}>{mutationButtonLabel("Deleting…", "Continue", deleteMutation)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CurrentPasswordConfirmationDialog
        open={confirmOpen && passwordConfirmationOpen}
        onOpenChange={setPasswordConfirmationOpen}
        title="Confirm permanent deletion"
        description={`Enter your current password to delete ${preview?.proof_count ?? 0} payment proof image${preview?.proof_count === 1 ? "" : "s"}.`}
        destructive
        pending={deleteMutation.isPending}
        disabled={isMutationRateLimited(deleteMutation)}
        confirmLabel={mutationButtonLabel("Deleting…", "Delete images", deleteMutation)}
        onConfirm={deleteProofs}
      />
    </div>
  );
}
