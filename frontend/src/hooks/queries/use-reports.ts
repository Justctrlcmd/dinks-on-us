"use client";

import { useQuery } from "@tanstack/react-query";
import { reportKeys } from "@/config/query-keys";
import {
  getCourtUtilizationReport,
  getOperationsReport,
  getPaymentReport,
  getPopularTimesReport,
  getReportsOverview,
  getReservationReport,
  getRevenueReport,
} from "@/services/reports/reports-service";
import type { ReportFilters, ReportGrouping } from "@/types/reports";

const historicalStaleTime = 60_000;

export const useReportsOverview = (filters: ReportFilters, enabled = true) => useQuery({
  queryKey: reportKeys.overview(filters), queryFn: ({ signal }) => getReportsOverview(filters, signal).then((response) => response.data), enabled, staleTime: historicalStaleTime, placeholderData: (previous) => previous,
});

export const useRevenueReport = (filters: ReportFilters, groupBy: ReportGrouping, enabled = true) => useQuery({
  queryKey: reportKeys.revenue(filters, groupBy), queryFn: ({ signal }) => getRevenueReport(filters, groupBy, signal).then((response) => response.data), enabled, staleTime: historicalStaleTime, placeholderData: (previous) => previous,
});

export const useReservationReport = (filters: ReportFilters, enabled = true) => useQuery({
  queryKey: reportKeys.reservations(filters), queryFn: ({ signal }) => getReservationReport(filters, signal).then((response) => response.data), enabled, staleTime: historicalStaleTime, placeholderData: (previous) => previous,
});

export const useCourtUtilizationReport = (filters: ReportFilters, enabled = true) => useQuery({
  queryKey: reportKeys.courtUtilization(filters), queryFn: ({ signal }) => getCourtUtilizationReport(filters, signal).then((response) => response.data), enabled, staleTime: historicalStaleTime, placeholderData: (previous) => previous,
});

export const usePopularTimesReport = (filters: ReportFilters, enabled = true) => useQuery({
  queryKey: reportKeys.popularTimes(filters), queryFn: ({ signal }) => getPopularTimesReport(filters, signal).then((response) => response.data), enabled, staleTime: historicalStaleTime, placeholderData: (previous) => previous,
});

export const usePaymentReport = (filters: ReportFilters, enabled = true) => useQuery({
  queryKey: reportKeys.payments(filters), queryFn: ({ signal }) => getPaymentReport(filters, signal).then((response) => response.data), enabled, staleTime: historicalStaleTime, placeholderData: (previous) => previous,
});

export const useOperationsReport = (filters: ReportFilters, enabled = true) => useQuery({
  queryKey: reportKeys.operations(filters), queryFn: ({ signal }) => getOperationsReport(filters, signal).then((response) => response.data), enabled, staleTime: historicalStaleTime, placeholderData: (previous) => previous,
});
