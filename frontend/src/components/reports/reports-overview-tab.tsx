"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { FiActivity, FiCheckCircle, FiClock, FiGrid } from "react-icons/fi";
import { LuPhilippinePeso } from "react-icons/lu";
import { PortalMetricCard } from "@/components/portal/portal-metric-card";
import {
  AccessibleDataTable,
  AnalyticsCard,
  compactNumber,
  currency,
  formatPercent,
  ReportQueryState,
  type ReportQueryResult,
} from "@/components/reports/report-shared";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatHourRange } from "@/lib/time";
import type { ReportsOverview } from "@/types/reports";

const revenueConfig = {
  recognized_revenue: { label: "Recognized revenue", color: "var(--chart-2)" },
} satisfies ChartConfig;
const utilizationConfig = { utilization: { label: "Utilization", color: "var(--chart-1)" } } satisfies ChartConfig;
const sourceConfig = { count: { label: "Reservations", color: "var(--chart-3)" } } satisfies ChartConfig;
const outcomeConfig = { count: { label: "Reservations", color: "var(--chart-4)" } } satisfies ChartConfig;

function periodLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

export function ReportsOverviewTab({ query }: { query: ReportQueryResult<ReportsOverview> }) {
  const data = query.data;

  return (
    <ReportQueryState pending={query.isPending} error={query.isError} empty={!data?.has_reportable_data} loadingMessage="Loading overview analytics…" onRetry={() => void query.refetch()}>
      {data ? <div className="grid gap-4">
        <section aria-label="Reports overview KPIs" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <PortalMetricCard label="Recognized Revenue" value={currency.format(data.kpis.recognized_revenue)} icon={LuPhilippinePeso} iconClassName="bg-success/10 text-success" />
          <PortalMetricCard label="Completed Reservations" value={data.kpis.completed_reservations} icon={FiCheckCircle} iconClassName="bg-primary/10 text-primary" />
          <PortalMetricCard label="Court Utilization" value={formatPercent(data.kpis.court_utilization_percent)} icon={FiGrid} iconClassName="bg-[var(--chart-3)]/20 text-foreground" />
          <PortalMetricCard label="Average Reservation Value" value={data.kpis.average_reservation_value === null ? "—" : currency.format(data.kpis.average_reservation_value)} icon={FiActivity} iconClassName="bg-energy/10 text-energy" />
        </section>

        <section aria-label="Secondary report metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <PortalMetricCard label="Completed Court Hours" value={data.secondary_metrics.completed_court_hours} icon={FiClock} iconClassName="bg-primary/10 text-primary" />
          <PortalMetricCard label="No-Show Rate" value={formatPercent(data.secondary_metrics.no_show_rate_percent)} icon={FiActivity} iconClassName="bg-destructive/10 text-destructive" />
          <PortalMetricCard label="Cancellation Rate" value={formatPercent(data.secondary_metrics.cancellation_rate_percent)} icon={FiActivity} iconClassName="bg-energy/10 text-energy" />
          <PortalMetricCard label="Walk-In Share" value={formatPercent(data.secondary_metrics.walk_in_share_percent)} icon={FiActivity} iconClassName="bg-[var(--chart-5)]/25 text-foreground" />
        </section>

        <div className="grid items-start gap-4 xl:grid-cols-2">
          <AnalyticsCard title="Revenue trend" description={`Recognized revenue grouped by ${data.revenue_trend.group_by}.`}>
            <ChartContainer config={revenueConfig} className="h-[260px] w-full" aria-label="Recognized revenue trend chart">
              <LineChart accessibilityLayer data={data.revenue_trend.points} margin={{ left: 4, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={10} tickFormatter={periodLabel} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(value) => compactNumber.format(Number(value))} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="recognized_revenue" stroke="var(--color-recognized_revenue)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ChartContainer>
            <AccessibleDataTable caption="Recognized revenue trend" columns={[{ key: "period", label: "Period" }, { key: "revenue", label: "Revenue", align: "right" }]} rows={data.revenue_trend.points.map((point) => ({ period: periodLabel(point.period), revenue: currency.format(point.recognized_revenue) }))} />
          </AnalyticsCard>

          <AnalyticsCard title="Court utilization" description="Completed hours as a share of elapsed sellable hours.">
            <ChartContainer config={utilizationConfig} className="h-[260px] w-full" aria-label="Court utilization comparison chart">
              <BarChart accessibilityLayer data={data.court_utilization.map((court) => ({ ...court, utilization: court.utilization_percent ?? 0 }))} layout="vertical" margin={{ left: 8, right: 20 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="court_name" width={72} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="utilization" fill="var(--color-utilization)" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ChartContainer>
            <AccessibleDataTable caption="Court utilization comparison" columns={[{ key: "court", label: "Court" }, { key: "hours", label: "Completed / sellable", align: "right" }, { key: "utilization", label: "Utilization", align: "right" }]} rows={data.court_utilization.map((court) => ({ court: court.court_name, hours: `${court.completed_hours} / ${court.sellable_hours}`, utilization: formatPercent(court.utilization_percent) }))} />
          </AnalyticsCard>

          <AnalyticsCard title="Reservation sources" description="Reservations grouped by submission source.">
            <ChartContainer config={sourceConfig} className="h-[230px] w-full" aria-label="Reservation source breakdown chart">
              <BarChart accessibilityLayer data={data.source_breakdown} margin={{ left: 0, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </AnalyticsCard>

          <AnalyticsCard title="Reservation outcomes" description="Final outcomes recorded in the selected period.">
            <ChartContainer config={outcomeConfig} className="h-[230px] w-full" aria-label="Reservation outcomes chart">
              <BarChart accessibilityLayer data={[
                { label: "Completed", count: data.outcomes.completed },
                { label: "Cancelled", count: data.outcomes.cancelled },
                { label: "Rejected", count: data.outcomes.rejected },
                { label: "No-Show", count: data.outcomes.no_show },
              ]} margin={{ left: 0, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </AnalyticsCard>
        </div>

        <AnalyticsCard title="Popular completed hours" description="The highest-use one-hour periods in this range.">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {data.popular_times.map((hour, index) => <div key={hour.start_hour} className="flex items-center justify-between rounded-lg border px-3 py-2.5"><div><p className="text-xs font-medium text-muted-foreground">#{index + 1}</p><p className="font-semibold">{formatHourRange(hour.start_hour, hour.start_hour + 1)}</p></div><div className="text-right"><p className="font-heading text-lg font-bold">{hour.completed_slots}</p><p className="text-xs text-muted-foreground">completed hours</p></div></div>)}
          </div>
        </AnalyticsCard>

      </div> : null}
    </ReportQueryState>
  );
}
