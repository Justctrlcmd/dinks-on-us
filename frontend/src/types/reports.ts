export type ReportSource = "ONLINE" | "WALK_IN";
export type ReportGrouping = "day" | "week" | "month";

export type ReportFilters = {
  from: string;
  to: string;
  court_id: number | null;
  source: ReportSource | null;
};

export type ReportContext = {
  range: { from: string; to: string; time_zone: string };
  filters: { court_id: number | null; source: ReportSource | null };
  courts: Array<{ id: number; name: string; is_active: boolean }>;
  capacity_basis: string;
};

export type RevenueTrendPoint = {
  period: string;
  completed_revenue: number;
  no_show_revenue: number;
  recognized_revenue: number;
};

export type CourtUtilization = {
  court_id: number;
  court_name: string;
  completed_hours: number;
  potential_hours: number;
  closed_hours: number;
  sellable_hours: number;
  utilization_percent: number | null;
};

export type ReservationOutcomes = { completed: number; cancelled: number; rejected: number; no_show: number };
export type OutcomeRates = { no_show_percent: number | null; cancellation_percent: number | null };
export type SourceBreakdown = { source: ReportSource; label: string; count: number; share_percent: number | null };
export type PopularHour = { start_hour: number; completed_slots: number; sellable_slots: number; utilization_percent: number | null };

export type ReportsOverview = {
  context: ReportContext;
  has_reportable_data: boolean;
  kpis: {
    recognized_revenue: number;
    completed_reservations: number;
    court_utilization_percent: number | null;
    average_reservation_value: number | null;
  };
  secondary_metrics: {
    completed_court_hours: number;
    no_show_rate_percent: number | null;
    cancellation_rate_percent: number | null;
    walk_in_share_percent: number | null;
  };
  revenue_trend: { group_by: ReportGrouping; points: RevenueTrendPoint[] };
  court_utilization: CourtUtilization[];
  source_breakdown: SourceBreakdown[];
  popular_times: PopularHour[];
  outcomes: ReservationOutcomes;
  scope_note: string;
};

export type RevenueReport = {
  context: ReportContext;
  has_reportable_data: boolean;
  metrics: {
    recognized_revenue: number;
    completed_reservation_revenue: number;
    no_show_recognized_revenue: number;
    completed_reservations: number;
    average_reservation_value: number | null;
  };
  trend: { group_by: ReportGrouping; points: RevenueTrendPoint[] };
  composition: {
    original_slot_revenue: number;
    extension_slot_revenue: number;
    additional_player_revenue: number;
    rental_equipment_revenue: number;
    other_adjustment_revenue: number;
  };
  scope_note: string;
};

export type ReservationReport = {
  context: ReportContext;
  has_reportable_data: boolean;
  trend_basis: "submitted_at";
  trend: { group_by: ReportGrouping; points: Array<{ period: string; count: number }> };
  outcomes: ReservationOutcomes;
  rates: OutcomeRates;
  sources: SourceBreakdown[];
  walk_in_share_percent: number | null;
};

export type CourtUtilizationReport = {
  context: ReportContext;
  has_reportable_data: boolean;
  summary: {
    completed_hours: number;
    potential_hours: number;
    closed_hours: number;
    sellable_hours: number;
    utilization_percent: number | null;
    operational_availability_percent: number | null;
  };
  courts: CourtUtilization[];
  day_of_week: Array<{
    day_index: number;
    day: string;
    completed_reservations: number;
    completed_hours: number;
    sellable_hours: number;
    slot_revenue: number;
    utilization_percent: number | null;
  }>;
  capacity_note: string;
};

export type PopularTimesReport = {
  context: ReportContext;
  has_reportable_data: boolean;
  measure: "completed_slot_count";
  heatmap: Array<{
    day_index: number;
    day: string;
    start_hour: number;
    completed_slots: number;
    sellable_slots: number;
    utilization_percent: number | null;
  }>;
  popular_hours: PopularHour[];
  capacity_note: string;
};

export type PaymentReport = {
  context: ReportContext;
  has_reportable_data: boolean;
  verification: { sample_size: number; average_minutes: number | null; median_minutes: number | null };
  verified_payments: {
    count: number;
    amount: number;
    methods: Array<{ name: string; count: number; amount: number; share_percent: number | null }>;
  };
};

export type OperationsReport = {
  context: ReportContext;
  has_reportable_data: boolean;
  outcomes: ReservationOutcomes;
  rates: OutcomeRates;
  rejection_concerns: Array<{ concern: string; label: string; count: number }>;
  rescheduling: {
    reservations_affected: number;
    operations: number;
  };
  extensions: { completed_reservations: number; reservations_with_extension: number; rate_percent: number | null };
  closures: {
    potential_hours: number;
    closed_hours: number;
    sellable_hours: number;
    operational_availability_percent: number | null;
  };
  capacity_note: string;
};
