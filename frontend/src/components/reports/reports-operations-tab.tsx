"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { FiClock, FiRefreshCw, FiSlash, FiXCircle } from "react-icons/fi";
import { PortalMetricCard } from "@/components/portal/portal-metric-card";
import {
  AccessibleDataTable,
  AnalyticsCard,
  currency,
  formatDuration,
  formatPercent,
  ReportQueryState,
  type ReportQueryResult,
} from "@/components/reports/report-shared";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { OperationsReport, PaymentReport } from "@/types/reports";

const concernConfig = { count: { label: "Rejections", color: "var(--chart-4)" } } satisfies ChartConfig;
const paymentConfig = { count: { label: "Verified payments", color: "var(--chart-2)" } } satisfies ChartConfig;

export function ReportsOperationsTab({ operationsQuery, paymentQuery }: {
  operationsQuery: ReportQueryResult<OperationsReport>;
  paymentQuery: ReportQueryResult<PaymentReport>;
}) {
  const operations = operationsQuery.data;
  const payments = paymentQuery.data;
  const pending = operationsQuery.isPending || paymentQuery.isPending;
  const error = operationsQuery.isError || paymentQuery.isError;
  const empty = !operations?.has_reportable_data && !payments?.has_reportable_data;

  return (
    <ReportQueryState pending={pending} error={error} empty={empty} loadingMessage="Loading operations analytics…" onRetry={() => { void operationsQuery.refetch(); void paymentQuery.refetch(); }}>
      {operations && payments ? <div className="grid gap-4">
        <section aria-label="Operations KPIs" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <PortalMetricCard label="No-Show Rate" value={formatPercent(operations.rates.no_show_percent)} icon={FiSlash} iconClassName="bg-destructive/10 text-destructive" />
          <PortalMetricCard label="Cancellation Rate" value={formatPercent(operations.rates.cancellation_percent)} icon={FiXCircle} iconClassName="bg-energy/10 text-energy" />
          <PortalMetricCard label="Average Verification" value={formatDuration(payments.verification.average_minutes)} icon={FiClock} iconClassName="bg-primary/10 text-primary" />
          <PortalMetricCard label="Median Verification" value={formatDuration(payments.verification.median_minutes)} icon={FiClock} iconClassName="bg-[var(--chart-3)]/20 text-foreground" />
        </section>

        <div className="grid items-start gap-4 xl:grid-cols-2">
          <AnalyticsCard title="Rejection concerns" description="System-defined concerns recorded during payment review.">
            {operations.rejection_concerns.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No rejected reservations were recorded in this range.</p> : <>
              <ChartContainer config={concernConfig} className="h-[270px] w-full" aria-label="Rejection concerns chart">
                <BarChart accessibilityLayer data={operations.rejection_concerns} layout="vertical" margin={{ left: 20, right: 16 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="label" width={130} tickLine={false} axisLine={false} tick={{ fontSize: 9 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ChartContainer>
              <AccessibleDataTable caption="Rejection concerns" columns={[{ key: "concern", label: "Concern" }, { key: "count", label: "Rejections", align: "right" }]} rows={operations.rejection_concerns.map((item) => ({ concern: item.label, count: item.count }))} />
            </>}
          </AnalyticsCard>

          <AnalyticsCard title="Verified payment methods" description="Renamed methods stay grouped under their current name.">
            {payments.verified_payments.methods.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No verified payments were recorded in this range.</p> : <>
              <ChartContainer config={paymentConfig} className="h-[270px] w-full" aria-label="Verified payment methods chart">
                <BarChart accessibilityLayer data={payments.verified_payments.methods} margin={{ left: 0, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ChartContainer>
              <AccessibleDataTable caption="Verified payment methods" columns={[{ key: "method", label: "Method" }, { key: "count", label: "Payments", align: "right" }, { key: "amount", label: "Amount", align: "right" }, { key: "share", label: "Share", align: "right" }]} rows={payments.verified_payments.methods.map((method) => ({ method: method.name, count: method.count, amount: currency.format(method.amount), share: formatPercent(method.share_percent) }))} />
            </>}
          </AnalyticsCard>
        </div>

        <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnalyticsCard title="Rescheduling" description="Action workload and affected reservations.">
            <dl className="grid gap-3">
              <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">Reservations affected</dt><dd className="font-heading text-lg font-bold">{operations.rescheduling.reservations_affected}</dd></div>
              <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">Total operations</dt><dd className="font-heading text-lg font-bold">{operations.rescheduling.operations}</dd></div>
            </dl>
          </AnalyticsCard>

          <AnalyticsCard title="Extensions" description="Completed reservations with additional court time.">
            <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><FiRefreshCw aria-hidden="true" /></span><div><p className="font-heading text-2xl font-bold">{formatPercent(operations.extensions.rate_percent)}</p><p className="text-sm text-muted-foreground">{operations.extensions.reservations_with_extension} of {operations.extensions.completed_reservations} completed reservations</p></div></div>
          </AnalyticsCard>

          <AnalyticsCard title="Operational availability" description="Capacity left open after closures and blocks.">
            <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-success/10 text-success"><FiClock aria-hidden="true" /></span><div><p className="font-heading text-2xl font-bold">{formatPercent(operations.closures.operational_availability_percent)}</p><p className="text-sm text-muted-foreground">{operations.closures.sellable_hours} sellable · {operations.closures.closed_hours} closed hours</p></div></div>
          </AnalyticsCard>
        </div>

      </div> : null}
    </ReportQueryState>
  );
}
