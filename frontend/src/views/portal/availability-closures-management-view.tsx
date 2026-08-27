"use client";

import { useState } from "react";
import { FiActivity, FiCalendar, FiClock, FiLock, FiPlus, FiUnlock } from "react-icons/fi";
import { ErrorState } from "@/components/common/error-state";
import { FormFieldWrapper } from "@/components/common/forms/form-field-wrapper";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AvailabilityClosureFormDialog } from "@/forms/availability-closures/availability-closure-form-dialog";
import { useReopenClosure } from "@/hooks/mutations/use-availability-closure-mutations";
import { useAvailabilityActivity, useAvailabilityClosures } from "@/hooks/queries/use-availability-closures";
import { useCourtPricingManagement } from "@/hooks/queries/use-court-pricing";
import { formatDateOnly, formatDateTime } from "@/lib/date";
import { formatHourRange } from "@/lib/time";
import type { AvailabilityActivity, AvailabilityClosure, ClosurePeriod } from "@/types/availability-closures";

function formatPeriods(periods: ClosurePeriod[]) {
  return periods.map((period) => formatHourRange(period.start_hour, period.end_hour)).join(" · ");
}

function CompactEmpty({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="w-full rounded-lg border border-dashed p-4 text-center"><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs text-muted-foreground">{description}</p>{action ? <div className="mt-3">{action}</div> : null}</div>;
}

function ClosureCard({ closure, onReopen }: { closure: AvailabilityClosure; onReopen: (closure: AvailabilityClosure) => void }) {
  const wholeOperation = closure.type === "entire_operation";
  const heading = wholeOperation ? "Entire operation closed" : `${closure.court?.name ?? "Court"} closed`;
  const detail = wholeOperation ? formatDateOnly(closure.date) : `${formatDateOnly(closure.date)} · ${formatPeriods(closure.periods)}`;

  return (
    <article className="flex min-h-14 items-center gap-2.5 rounded-lg border border-border bg-background p-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive"><FiLock aria-hidden="true" className="size-3.5" /></span>
      <div className="min-w-0 flex-1">
        <h3 className="font-heading text-sm font-bold">{heading}</h3>
        <p className="text-xs font-medium text-foreground">{detail}</p>
      </div>
      <Button variant="ghost" size="icon-sm" aria-label={`Reopen ${heading.toLowerCase()}`} onClick={() => onReopen(closure)}><FiUnlock aria-hidden="true" /></Button>
    </article>
  );
}

function ScheduleOverview() {
  const query = useCourtPricingManagement();
  if (query.isPending) return <LoadingState message="Loading schedule overview…" />;
  if (query.isError) return <ErrorState title="We couldn't load the schedule overview." onRetry={() => void query.refetch()} />;

  const { configuration, courts } = query.data;
  if (!configuration) return <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Configure operating hours and rates in Courts &amp; Pricing to enable court-time closures.</p>;

  const items = [
    { icon: FiClock, label: "Operating hours", value: formatHourRange(configuration.opening_hour, configuration.closing_hour) },
    { icon: FiCalendar, label: "Active courts", value: `${courts.length} ${courts.length === 1 ? "court" : "courts"}` },
    { icon: FiActivity, label: "Reservation slots", value: "1 hour each" },
    { icon: FiLock, label: "Rate coverage", value: "Weekday & weekend" },
  ];

  return <div className="grid gap-2 sm:grid-cols-2">{items.map(({ icon: Icon, label, value }) => <div key={label} className="flex items-center gap-2.5 rounded-lg border border-border bg-background p-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon aria-hidden="true" className="size-3.5" /></span><div className="min-w-0"><p className="text-[0.68rem] font-bold uppercase tracking-[.1em] text-muted-foreground">{label}</p><p className="truncate font-heading text-sm font-bold">{value}</p></div></div>)}<p className="flex items-center gap-1.5 border-t border-border pt-2.5 text-xs text-muted-foreground sm:col-span-2"><FiClock aria-hidden="true" className="size-3.5" />Updated {formatDateTime(configuration.updated_at)}</p></div>;
}

function activityTitle(activity: AvailabilityActivity) {
  const reopened = activity.action === "DATE_REOPENED" || activity.action === "COURT_SLOT_REOPENED";
  if (activity.details.closure_type === "entire_operation") {
    return `Entire operation ${reopened ? "reopened" : "closed"} for ${formatDateOnly(activity.details.date)}`;
  }
  return `${activity.details.court_name ?? "Court"} ${reopened ? "reopened" : "closed"} for ${formatDateOnly(activity.details.date)}, ${formatPeriods(activity.details.periods)}`;
}

function ActivityCard({ activity }: { activity: AvailabilityActivity }) {
  const reopened = activity.action === "DATE_REOPENED" || activity.action === "COURT_SLOT_REOPENED";
  const Icon = reopened ? FiUnlock : FiLock;
  return <article className="flex min-h-16 gap-2.5 rounded-lg border border-border bg-background p-2.5"><span className={reopened ? "grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" : "grid size-8 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive"}><Icon aria-hidden="true" className="size-3.5" /></span><div className="min-w-0 flex-1"><h3 className="font-heading text-sm font-bold leading-5">{activityTitle(activity)}</h3><p className="mt-0.5 text-xs text-muted-foreground"><span className="font-medium text-foreground">{reopened ? "Reopening description" : "Internal reason"}:</span> {activity.details.reason}</p><p className="mt-1 text-xs text-muted-foreground">{reopened ? "Reopened" : "Set"} {formatDateTime(activity.created_at)} by {activity.actor_name}</p></div></article>;
}

export function AvailabilityClosuresManagementView() {
  const [closurePage, setClosurePage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [reopening, setReopening] = useState<AvailabilityClosure | null>(null);
  const [reopeningReason, setReopeningReason] = useState("");
  const closuresQuery = useAvailabilityClosures(closurePage);
  const activityQuery = useAvailabilityActivity(activityPage);
  const pricingQuery = useCourtPricingManagement();
  const reopenMutation = useReopenClosure();

  async function reopen() {
    const reason = reopeningReason.trim();
    if (!reopening || !reason) return;
    try {
      await reopenMutation.mutateAsync({ closure: reopening, reason });
      setReopening(null);
      setReopeningReason("");
      if (closuresQuery.data?.data.length === 1 && closurePage > 1) setClosurePage((page) => page - 1);
    } catch {}
  }

  function openReopenDialog(closure: AvailabilityClosure) {
    setReopeningReason("");
    setReopening(closure);
  }

  function closeReopenDialog() {
    if (reopenMutation.isPending) return;
    setReopening(null);
    setReopeningReason("");
  }

  return (
    <div className="flex flex-col gap-4 xl:min-h-[calc(100svh-4rem)]">
      <PageHeader title="Availability & Closures" description="Close the full operation or selected court times without changing the shared court schedule." />
      <div className="grid shrink-0 items-start gap-4 xl:grid-cols-2">
        <Card size="sm">
          <CardHeader><CardTitle>Closed dates &amp; time blocks</CardTitle><CardDescription>Active closures preventing reservations.</CardDescription><CardAction><Button size="sm" onClick={() => setFormOpen(true)} disabled={pricingQuery.isPending || pricingQuery.isError}><FiPlus aria-hidden="true" />Add closure</Button></CardAction></CardHeader>
          <CardContent className="grid gap-2">
            {closuresQuery.isPending ? <LoadingState message="Loading active closures…" /> : closuresQuery.isError ? <ErrorState title="We couldn't load active closures." onRetry={() => void closuresQuery.refetch()} /> : closuresQuery.data.data.length === 0 ? <CompactEmpty title="No active closures." description="Closed dates and court times will appear here." /> : <>{closuresQuery.data.data.map((closure) => <ClosureCard key={closure.id} closure={closure} onReopen={openReopenDialog} />)}{closuresQuery.data.meta.last_page > 1 ? <Pagination page={closurePage} lastPage={closuresQuery.data.meta.last_page} onChange={setClosurePage} /> : null}</>}
          </CardContent>
        </Card>
        <Card size="sm"><CardHeader><CardTitle>Schedule Overview</CardTitle><CardDescription>Current operating details used for closures.</CardDescription></CardHeader><CardContent><ScheduleOverview /></CardContent></Card>
      </div>
      <section aria-labelledby="availability-activity-title" className="flex min-h-0 flex-1"><Card size="sm" className="h-full w-full"><CardHeader><CardTitle id="availability-activity-title">Activity Log</CardTitle><CardDescription>Recent closures, reopenings, and internal reasons.</CardDescription></CardHeader><CardContent className="flex flex-1 flex-col gap-2">{activityQuery.isPending ? <LoadingState message="Loading availability activity…" /> : activityQuery.isError ? <ErrorState title="We couldn't load the activity log." onRetry={() => void activityQuery.refetch()} /> : activityQuery.data.data.length === 0 ? <div className="flex flex-1 items-center"><CompactEmpty title="No availability activity yet." description="Closures and reopenings will be recorded here." /></div> : <>{activityQuery.data.data.map((activity) => <ActivityCard key={activity.id} activity={activity} />)}{activityQuery.data.meta.last_page > 1 ? <div className="mt-auto pt-1"><Pagination page={activityPage} lastPage={activityQuery.data.meta.last_page} onChange={setActivityPage} /></div> : null}</>}</CardContent></Card></section>
      {formOpen && !pricingQuery.isPending && !pricingQuery.isError ? <AvailabilityClosureFormDialog configuration={pricingQuery.data.configuration} courts={pricingQuery.data.courts} open onOpenChange={setFormOpen} /> : null}
      <Dialog open={Boolean(reopening)} onOpenChange={(open) => !open && closeReopenDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reopen this closure?</DialogTitle>
            <DialogDescription>{reopening?.type === "entire_operation" ? `All courts will become available again for ${reopening ? formatDateOnly(reopening.date) : "this date"}, unless another court-time closure still applies.` : `The selected ${reopening?.court?.name ?? "court"} time ranges will become available again.`}</DialogDescription>
          </DialogHeader>
          <form id="availability-reopen-form" className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void reopen(); }}>
            <FormFieldWrapper id="reopen-reason" label="Reopening description" description="This replaces the internal reason shown for this reopening in the activity log." required>
              <Textarea id="reopen-reason" rows={4} required maxLength={1000} value={reopeningReason} onChange={(event) => setReopeningReason(event.target.value)} placeholder="Explain why this closure is being reopened…" />
            </FormFieldWrapper>
          </form>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={reopenMutation.isPending} />}>Cancel</DialogClose>
            <Button form="availability-reopen-form" type="submit" disabled={reopenMutation.isPending || reopeningReason.trim().length === 0}>{reopenMutation.isPending ? "Reopening…" : "Reopen closure"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
