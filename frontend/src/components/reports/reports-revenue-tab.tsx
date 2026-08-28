"use client";

import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { FiActivity, FiCheckCircle, FiTrendingUp } from "react-icons/fi";
import { LuPhilippinePeso } from "react-icons/lu";
import { SelectWithLabel } from "@/components/common/forms/select-with-label";
import { PortalMetricCard } from "@/components/portal/portal-metric-card";
import {
  AccessibleDataTable,
  AnalyticsCard,
  compactNumber,
  currency,
  ReportQueryState,
  type ReportQueryResult,
} from "@/components/reports/report-shared";
import { ChartContainer, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { ReportGrouping, RevenueReport } from "@/types/reports";

const trendConfig = {
  completed_revenue: { label: "Completed", color: "var(--chart-2)" },
  no_show_revenue: { label: "No-show retained", color: "var(--chart-4)" },
} satisfies ChartConfig;
const compositionConfig = { amount: { label: "Revenue", color: "var(--chart-1)" } } satisfies ChartConfig;

const groupingOptions = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
] as const;

function periodLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

export function ReportsRevenueTab({ query, groupBy, onGroupByChange }: {
  query: ReportQueryResult<RevenueReport>;
  groupBy: ReportGrouping;
  onGroupByChange: (value: ReportGrouping) => void;
}) {
  const data = query.data;
  const composition = data ? [
    { label: "Original slots", amount: data.composition.original_slot_revenue },
    { label: "Extensions", amount: data.composition.extension_slot_revenue },
    { label: "Additional players", amount: data.composition.additional_player_revenue },
    { label: "Equipment", amount: data.composition.rental_equipment_revenue },
    { label: "Other adjustments", amount: data.composition.other_adjustment_revenue },
  ] : [];

  return (
    <ReportQueryState pending={query.isPending} error={query.isError} empty={!data?.has_reportable_data} loadingMessage="Loading revenue analytics…" onRetry={() => void query.refetch()}>
      {data ? <div className="grid gap-4">
        <section aria-label="Revenue KPIs" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <PortalMetricCard label="Recognized Revenue" value={currency.format(data.metrics.recognized_revenue)} icon={LuPhilippinePeso} iconClassName="bg-success/10 text-success" />
          <PortalMetricCard label="Completed Revenue" value={currency.format(data.metrics.completed_reservation_revenue)} icon={FiCheckCircle} iconClassName="bg-primary/10 text-primary" />
          <PortalMetricCard label="No-Show Revenue" value={currency.format(data.metrics.no_show_recognized_revenue)} icon={FiActivity} iconClassName="bg-energy/10 text-energy" />
          <PortalMetricCard label="Average Reservation Value" value={data.metrics.average_reservation_value === null ? "—" : currency.format(data.metrics.average_reservation_value)} icon={FiTrendingUp} iconClassName="bg-[var(--chart-3)]/20 text-foreground" />
        </section>

        <AnalyticsCard title="Revenue trend" description="Completed and retained no-show revenue are grouped by recognition date.">
          <div className="mb-3 flex justify-end">
            <SelectWithLabel id="revenue-grouping" ariaLabel="Group revenue trend" value={groupBy} options={groupingOptions} className="w-36" onValueChange={(value) => value && onGroupByChange(value as ReportGrouping)} />
          </div>
          <ChartContainer config={trendConfig} className="h-[300px] w-full" aria-label="Revenue trend chart">
            <BarChart accessibilityLayer data={data.trend.points} margin={{ left: 4, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={10} tickFormatter={periodLabel} minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(value) => compactNumber.format(Number(value))} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend content={<ChartLegendContent />} />
              <Bar dataKey="completed_revenue" stackId="revenue" fill="var(--color-completed_revenue)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="no_show_revenue" stackId="revenue" fill="var(--color-no_show_revenue)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
          <AccessibleDataTable caption="Revenue trend" columns={[{ key: "period", label: "Period" }, { key: "completed", label: "Completed", align: "right" }, { key: "noShow", label: "No-show", align: "right" }, { key: "total", label: "Recognized", align: "right" }]} rows={data.trend.points.map((point) => ({ period: periodLabel(point.period), completed: currency.format(point.completed_revenue), noShow: currency.format(point.no_show_revenue), total: currency.format(point.recognized_revenue) }))} />
        </AnalyticsCard>

        <AnalyticsCard title="Completed revenue composition" description="Reconciles the parts of finalized completed reservation revenue.">
          <ChartContainer config={compositionConfig} className="h-[290px] w-full" aria-label="Completed revenue composition chart">
            <BarChart accessibilityLayer data={composition} layout="vertical" margin={{ left: 14, right: 20 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(value) => compactNumber.format(Number(value))} />
              <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={110} tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="amount" fill="var(--color-amount)" radius={[0, 5, 5, 0]} />
            </BarChart>
          </ChartContainer>
          <AccessibleDataTable caption="Completed revenue composition" columns={[{ key: "category", label: "Category" }, { key: "amount", label: "Amount", align: "right" }]} rows={composition.map((item) => ({ category: item.label, amount: currency.format(item.amount) }))} />
        </AnalyticsCard>

      </div> : null}
    </ReportQueryState>
  );
}
