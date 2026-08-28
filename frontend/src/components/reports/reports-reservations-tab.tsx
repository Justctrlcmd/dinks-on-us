"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { FiCheckCircle, FiSlash, FiTrendingUp, FiXCircle } from "react-icons/fi";
import { PortalMetricCard } from "@/components/portal/portal-metric-card";
import {
  AccessibleDataTable,
  AnalyticsCard,
  formatPercent,
  ReportQueryState,
  type ReportQueryResult,
} from "@/components/reports/report-shared";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { ReservationReport } from "@/types/reports";

const trendConfig = { count: { label: "Submitted reservations", color: "var(--chart-2)" } } satisfies ChartConfig;
const outcomeConfig = { count: { label: "Reservations", color: "var(--chart-4)" } } satisfies ChartConfig;
const sourceConfig = { count: { label: "Reservations", color: "var(--chart-3)" } } satisfies ChartConfig;

function periodLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

export function ReportsReservationsTab({ query }: { query: ReportQueryResult<ReservationReport> }) {
  const data = query.data;
  const outcomes = data ? [
    { label: "Completed", count: data.outcomes.completed },
    { label: "Cancelled", count: data.outcomes.cancelled },
    { label: "Rejected", count: data.outcomes.rejected },
    { label: "No-Show", count: data.outcomes.no_show },
  ] : [];

  return (
    <ReportQueryState pending={query.isPending} error={query.isError} empty={!data?.has_reportable_data} loadingMessage="Loading reservation analytics…" onRetry={() => void query.refetch()}>
      {data ? <div className="grid gap-4">
        <section aria-label="Reservation outcome KPIs" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <PortalMetricCard label="Completed" value={data.outcomes.completed} icon={FiCheckCircle} iconClassName="bg-success/10 text-success" />
          <PortalMetricCard label="Cancelled" value={data.outcomes.cancelled} icon={FiXCircle} iconClassName="bg-energy/10 text-energy" />
          <PortalMetricCard label="Rejected" value={data.outcomes.rejected} icon={FiSlash} iconClassName="bg-destructive/10 text-destructive" />
          <PortalMetricCard label="No-Show" value={data.outcomes.no_show} icon={FiTrendingUp} iconClassName="bg-foreground/10 text-muted-foreground" />
        </section>

        <div className="grid items-start gap-4 xl:grid-cols-2">
          <AnalyticsCard title="Reservation submissions" description="Activity grouped by the date reservations entered the system.">
            <ChartContainer config={trendConfig} className="h-[270px] w-full" aria-label="Reservation submission trend chart">
              <LineChart accessibilityLayer data={data.trend.points} margin={{ left: 4, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={10} tickFormatter={periodLabel} minTickGap={24} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ChartContainer>
            <AccessibleDataTable caption="Reservation submission trend" columns={[{ key: "period", label: "Period" }, { key: "count", label: "Submitted", align: "right" }]} rows={data.trend.points.map((point) => ({ period: periodLabel(point.period), count: point.count }))} />
          </AnalyticsCard>

          <AnalyticsCard title="Final outcomes" description="Completed, cancelled, rejected, and no-show decisions by their event dates.">
            <ChartContainer config={outcomeConfig} className="h-[270px] w-full" aria-label="Final reservation outcomes chart">
              <BarChart accessibilityLayer data={outcomes} margin={{ left: 0, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={0} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ChartContainer>
            <AccessibleDataTable caption="Final reservation outcomes" columns={[{ key: "outcome", label: "Outcome" }, { key: "count", label: "Reservations", align: "right" }]} rows={outcomes.map((outcome) => ({ outcome: outcome.label, count: outcome.count }))} />
          </AnalyticsCard>

          <AnalyticsCard title="Reservation source" description="Submitted reservations split between online and walk-in activity.">
            <ChartContainer config={sourceConfig} className="h-[230px] w-full" aria-label="Reservation source chart">
              <BarChart accessibilityLayer data={data.sources} margin={{ left: 0, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </AnalyticsCard>

          <AnalyticsCard title="Outcome rates" description="Rates use eligible finalized outcomes, not every submission.">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">No-show rate</p><p className="mt-2 font-heading text-2xl font-bold">{formatPercent(data.rates.no_show_percent)}</p><p className="mt-1 text-xs text-muted-foreground">No-show ÷ (completed + no-show)</p></div>
              <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Cancellation rate</p><p className="mt-2 font-heading text-2xl font-bold">{formatPercent(data.rates.cancellation_percent)}</p><p className="mt-1 text-xs text-muted-foreground">Cancelled ÷ accepted finalized outcomes</p></div>
            </div>
          </AnalyticsCard>
        </div>

      </div> : null}
    </ReportQueryState>
  );
}
