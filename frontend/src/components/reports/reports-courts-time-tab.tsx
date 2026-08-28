"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { FiActivity, FiClock, FiGrid, FiSlash } from "react-icons/fi";
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
import { cn } from "@/lib/utils";
import type { CourtUtilizationReport, PopularTimesReport } from "@/types/reports";

const utilizationConfig = { utilization: { label: "Utilization", color: "var(--chart-1)" } } satisfies ChartConfig;
const dayConfig = {
  completed_hours: { label: "Completed hours", color: "var(--chart-2)" },
  sellable_hours: { label: "Sellable hours", color: "var(--chart-3)" },
} satisfies ChartConfig;

function heatClass(value: number | null): string {
  if (value === null || value === 0) return "bg-muted/50 text-muted-foreground";
  if (value < 25) return "bg-primary/10 text-foreground";
  if (value < 50) return "bg-primary/25 text-foreground";
  if (value < 75) return "bg-primary/50 text-foreground";
  return "bg-primary text-primary-foreground";
}

function PopularTimeHeatmap({ data }: { data: PopularTimesReport }) {
  const hours = [...new Set(data.heatmap.map((cell) => cell.start_hour))].sort((a, b) => a - b);
  const days = [...new Map(data.heatmap.map((cell) => [cell.day_index, cell.day])).entries()].sort(([a], [b]) => a - b);

  return (
    <>
      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-max gap-1" style={{ gridTemplateColumns: `5.5rem repeat(${hours.length}, minmax(3.25rem, 1fr))` }} role="grid" aria-label="Completed court hours by weekday and time">
          <div role="columnheader" />
          {hours.map((hour) => <div key={hour} role="columnheader" className="px-1 py-2 text-center text-[0.65rem] font-semibold text-muted-foreground">{formatHourRange(hour, hour + 1).replace(" ", "")}</div>)}
          {days.flatMap(([dayIndex, day]) => [
            <div key={`${dayIndex}-label`} role="rowheader" className="flex items-center text-xs font-semibold">{day.slice(0, 3)}</div>,
            ...hours.map((hour) => {
              const cell = data.heatmap.find((candidate) => candidate.day_index === dayIndex && candidate.start_hour === hour);
              const completed = cell?.completed_slots ?? 0;
              return <div key={`${dayIndex}-${hour}`} role="gridcell" aria-label={`${day}, ${formatHourRange(hour, hour + 1)}: ${completed} completed hours, ${formatPercent(cell?.utilization_percent ?? null)} utilization`} className={cn("grid min-h-11 place-items-center rounded-md border text-xs font-bold tabular-nums", heatClass(cell?.utilization_percent ?? null))}>{completed}</div>;
            }),
          ])}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span>Cell value = completed hours</span><span className="inline-flex items-center gap-1"><span className="size-3 rounded bg-muted" />0%</span><span className="inline-flex items-center gap-1"><span className="size-3 rounded bg-primary/25" />1–49%</span><span className="inline-flex items-center gap-1"><span className="size-3 rounded bg-primary" />75%+</span></div>
    </>
  );
}

export function ReportsCourtsTimeTab({ utilizationQuery, popularTimesQuery }: {
  utilizationQuery: ReportQueryResult<CourtUtilizationReport>;
  popularTimesQuery: ReportQueryResult<PopularTimesReport>;
}) {
  const data = utilizationQuery.data;

  return (
    <ReportQueryState pending={utilizationQuery.isPending} error={utilizationQuery.isError} empty={!data?.has_reportable_data} loadingMessage="Loading court utilization…" onRetry={() => void utilizationQuery.refetch()}>
      {data ? <div className="grid gap-4">
        <section aria-label="Court and capacity KPIs" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <PortalMetricCard label="Completed Court Hours" value={data.summary.completed_hours} icon={FiClock} iconClassName="bg-primary/10 text-primary" />
          <PortalMetricCard label="Sellable Court Hours" value={data.summary.sellable_hours} icon={FiGrid} iconClassName="bg-[var(--chart-3)]/20 text-foreground" />
          <PortalMetricCard label="Court Utilization" value={formatPercent(data.summary.utilization_percent)} icon={FiActivity} iconClassName="bg-success/10 text-success" />
          <PortalMetricCard label="Closed / Blocked Hours" value={data.summary.closed_hours} icon={FiSlash} iconClassName="bg-energy/10 text-energy" />
        </section>

        <AnalyticsCard title="Utilization by court" description="Completed court hours compared with elapsed sellable capacity.">
          <ChartContainer config={utilizationConfig} className="h-[290px] w-full" aria-label="Utilization by court chart">
            <BarChart accessibilityLayer data={data.courts.map((court) => ({ ...court, utilization: court.utilization_percent ?? 0 }))} layout="vertical" margin={{ left: 8, right: 20 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
              <YAxis type="category" dataKey="court_name" tickLine={false} axisLine={false} width={72} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="utilization" fill="var(--color-utilization)" radius={[0, 5, 5, 0]} />
            </BarChart>
          </ChartContainer>
          <AccessibleDataTable caption="Court utilization" columns={[{ key: "court", label: "Court" }, { key: "completed", label: "Completed", align: "right" }, { key: "sellable", label: "Sellable", align: "right" }, { key: "utilization", label: "Utilization", align: "right" }]} rows={data.courts.map((court) => ({ court: court.court_name, completed: court.completed_hours, sellable: court.sellable_hours, utilization: formatPercent(court.utilization_percent) }))} />
        </AnalyticsCard>

        <AnalyticsCard title="Popular time heatmap" description="Day of week × one-hour slot, measured by completed court usage.">
          <ReportQueryState pending={popularTimesQuery.isPending} error={popularTimesQuery.isError} empty={!popularTimesQuery.data?.has_reportable_data} loadingMessage="Loading popular times…" onRetry={() => void popularTimesQuery.refetch()}>
            {popularTimesQuery.data ? <PopularTimeHeatmap data={popularTimesQuery.data} /> : null}
          </ReportQueryState>
        </AnalyticsCard>

        <AnalyticsCard title="Day-of-week performance" description="Completed slot revenue is shown by service day and excludes reservation-wide add-ons.">
          <ChartContainer config={dayConfig} className="h-[290px] w-full" aria-label="Day-of-week court performance chart">
            <BarChart accessibilityLayer data={data.day_of_week} margin={{ left: 0, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" tickFormatter={(value) => String(value).slice(0, 3)} tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={38} tickFormatter={(value) => compactNumber.format(Number(value))} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="completed_hours" fill="var(--color-completed_hours)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sellable_hours" fill="var(--color-sellable_hours)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
          <AccessibleDataTable caption="Day-of-week court performance" columns={[{ key: "day", label: "Day" }, { key: "reservations", label: "Completed reservations", align: "right" }, { key: "hours", label: "Completed hours", align: "right" }, { key: "revenue", label: "Slot revenue", align: "right" }, { key: "utilization", label: "Utilization", align: "right" }]} rows={data.day_of_week.map((day) => ({ day: day.day, reservations: day.completed_reservations, hours: day.completed_hours, revenue: currency.format(day.slot_revenue), utilization: formatPercent(day.utilization_percent) }))} />
        </AnalyticsCard>

      </div> : null}
    </ReportQueryState>
  );
}
