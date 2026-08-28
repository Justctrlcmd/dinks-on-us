"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ReportsCourtsTimeTab } from "@/components/reports/reports-courts-time-tab";
import { ReportsOperationsTab } from "@/components/reports/reports-operations-tab";
import { ReportsOverviewTab } from "@/components/reports/reports-overview-tab";
import { ReportsReservationsTab } from "@/components/reports/reports-reservations-tab";
import { ReportsRevenueTab } from "@/components/reports/reports-revenue-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCourtUtilizationReport,
  useOperationsReport,
  usePaymentReport,
  usePopularTimesReport,
  useReportsOverview,
  useReservationReport,
  useRevenueReport,
} from "@/hooks/queries/use-reports";
import { parseDateOnly, todayInTimeZone } from "@/lib/date";
import { formatReportRange, resolveReportPreset, type ReportDateRange, type ReportRangePreset } from "@/lib/report-date-ranges";
import type { ReportFilters, ReportGrouping, ReportSource } from "@/types/reports";

type ReportTab = "overview" | "revenue" | "reservations" | "courts" | "operations";

function automaticGrouping(range: ReportDateRange): ReportGrouping {
  const days = Math.round((parseDateOnly(range.to).getTime() - parseDateOnly(range.from).getTime()) / 86_400_000) + 1;
  if (days <= 45) return "day";
  if (days <= 180) return "week";
  return "month";
}

export function ReportsView() {
  const [today] = useState(todayInTimeZone);
  const initialRange = useMemo(() => resolveReportPreset("LAST_7_DAYS", today), [today]);
  const [tab, setTab] = useState<ReportTab>("overview");
  const [preset, setPreset] = useState<ReportRangePreset>("LAST_7_DAYS");
  const [range, setRange] = useState<ReportDateRange>(initialRange);
  const [draftRange, setDraftRange] = useState<ReportDateRange>(initialRange);
  const [courtId, setCourtId] = useState<number | null>(null);
  const [source, setSource] = useState<ReportSource | null>(null);
  const [revenueGrouping, setRevenueGrouping] = useState<ReportGrouping>("day");
  const filters = useMemo<ReportFilters>(() => ({ ...range, court_id: courtId, source }), [range, courtId, source]);
  const customError = draftRange.from > draftRange.to
    ? "The end date must be on or after the start date."
    : draftRange.to > today
      ? "Reports cannot include future dates."
      : null;

  const overviewQuery = useReportsOverview(filters);
  const revenueQuery = useRevenueReport(filters, revenueGrouping, tab === "revenue");
  const reservationQuery = useReservationReport(filters, tab === "reservations");
  const utilizationQuery = useCourtUtilizationReport(filters, tab === "courts");
  const popularTimesQuery = usePopularTimesReport(filters, tab === "courts");
  const operationsQuery = useOperationsReport(filters, tab === "operations");
  const paymentQuery = usePaymentReport(filters, tab === "operations");

  function changePreset(value: ReportRangePreset) {
    setPreset(value);
    if (value === "CUSTOM") {
      setDraftRange(range);
      return;
    }
    const next = resolveReportPreset(value, today);
    setRange(next);
    setDraftRange(next);
    setRevenueGrouping(automaticGrouping(next));
  }

  function applyCustomRange() {
    if (customError || !draftRange.from || !draftRange.to) return;
    setRange(draftRange);
    setRevenueGrouping(automaticGrouping(draftRange));
  }

  const courts = overviewQuery.data?.context.courts ?? [];

  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader title="Reports & Analytics" description={`Business performance for ${formatReportRange(range)}.`} />

      <ReportFilterBar
        preset={preset}
        draftRange={draftRange}
        today={today}
        courtId={courtId}
        source={source}
        courts={courts}
        customError={customError}
        onPresetChange={changePreset}
        onDraftRangeChange={setDraftRange}
        onApplyCustom={applyCustomRange}
        onCourtChange={setCourtId}
        onSourceChange={setSource}
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as ReportTab)} className="min-w-0">
        <div className="w-full overflow-hidden border-b">
          <TabsList variant="line" className="grid h-10 w-full grid-cols-5 gap-0 p-0 sm:inline-flex sm:w-fit sm:min-w-max sm:justify-start sm:gap-1 sm:px-1">
            <TabsTrigger value="overview" className="min-w-0 px-0.5 text-[0.68rem] sm:px-3 sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="revenue" className="min-w-0 px-0.5 text-[0.68rem] sm:px-3 sm:text-sm">Revenue</TabsTrigger>
            <TabsTrigger value="reservations" className="min-w-0 px-0.5 text-[0.68rem] sm:px-3 sm:text-sm">
              <span className="sm:hidden">Bookings</span>
              <span className="hidden sm:inline">Reservations</span>
            </TabsTrigger>
            <TabsTrigger value="courts" className="min-w-0 px-0.5 text-[0.68rem] sm:px-3 sm:text-sm">
              <span className="sm:hidden">Courts</span>
              <span className="hidden sm:inline">Courts & Time</span>
            </TabsTrigger>
            <TabsTrigger value="operations" className="min-w-0 px-0.5 text-[0.68rem] sm:px-3 sm:text-sm">
              <span className="sm:hidden">Ops</span>
              <span className="hidden sm:inline">Operations</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="min-w-0"><ReportsOverviewTab query={overviewQuery} /></TabsContent>
        <TabsContent value="revenue" className="min-w-0"><ReportsRevenueTab query={revenueQuery} groupBy={revenueGrouping} onGroupByChange={setRevenueGrouping} /></TabsContent>
        <TabsContent value="reservations" className="min-w-0"><ReportsReservationsTab query={reservationQuery} /></TabsContent>
        <TabsContent value="courts" className="min-w-0"><ReportsCourtsTimeTab utilizationQuery={utilizationQuery} popularTimesQuery={popularTimesQuery} /></TabsContent>
        <TabsContent value="operations" className="min-w-0"><ReportsOperationsTab operationsQuery={operationsQuery} paymentQuery={paymentQuery} /></TabsContent>
      </Tabs>
    </div>
  );
}
