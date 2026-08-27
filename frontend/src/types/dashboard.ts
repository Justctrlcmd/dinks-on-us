export type DashboardSlotStatus =
  | "AVAILABLE"
  | "CLOSED"
  | "PAST"
  | "PENDING"
  | "VERIFIED"
  | "ONGOING"
  | "COMPLETED";

export type DashboardSlot = {
  start_hour: number;
  end_hour: number;
  price: number;
  status: DashboardSlotStatus;
  reservation_id: number | null;
  reservation_reference: string | null;
};

export type DashboardCourt = {
  id: number;
  name: string;
  slots: DashboardSlot[];
};

export type DashboardData = {
  week: { start: string; end: string };
  kpis: {
    pending: number;
    verified: number;
    completed: number;
    revenue: number;
  };
  days: Array<{
    date: string;
    available_slots: number;
    total_slots: number;
    is_closed: boolean;
    is_past: boolean;
  }>;
  selected_date: {
    date: string;
    is_closed: boolean;
    opening_hour: number | null;
    closing_hour: number | null;
    courts: DashboardCourt[];
  };
};
