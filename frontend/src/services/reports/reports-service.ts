import { authFetch } from "@/lib/api";
import type {
  CourtUtilizationReport,
  OperationsReport,
  PaymentReport,
  PopularTimesReport,
  ReportFilters,
  ReportGrouping,
  ReportsOverview,
  ReservationReport,
  RevenueReport,
} from "@/types/reports";

function reportParams(filters: ReportFilters, groupBy?: ReportGrouping): URLSearchParams {
  const params = new URLSearchParams({ from: filters.from, to: filters.to });
  if (filters.court_id !== null) params.set("court_id", String(filters.court_id));
  if (filters.source) params.set("source", filters.source);
  if (groupBy) params.set("group_by", groupBy);
  return params;
}

function getReport<T>(path: string, filters: ReportFilters, signal?: AbortSignal, groupBy?: ReportGrouping) {
  return authFetch<T>(`/api/v1/management/reports/${path}?${reportParams(filters, groupBy)}`, { signal });
}

export const getReportsOverview = (filters: ReportFilters, signal?: AbortSignal) => getReport<ReportsOverview>("overview", filters, signal);
export const getRevenueReport = (filters: ReportFilters, groupBy: ReportGrouping, signal?: AbortSignal) => getReport<RevenueReport>("revenue", filters, signal, groupBy);
export const getReservationReport = (filters: ReportFilters, signal?: AbortSignal) => getReport<ReservationReport>("reservations", filters, signal);
export const getCourtUtilizationReport = (filters: ReportFilters, signal?: AbortSignal) => getReport<CourtUtilizationReport>("court-utilization", filters, signal);
export const getPopularTimesReport = (filters: ReportFilters, signal?: AbortSignal) => getReport<PopularTimesReport>("popular-times", filters, signal);
export const getPaymentReport = (filters: ReportFilters, signal?: AbortSignal) => getReport<PaymentReport>("payments", filters, signal);
export const getOperationsReport = (filters: ReportFilters, signal?: AbortSignal) => getReport<OperationsReport>("operations", filters, signal);
